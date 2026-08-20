import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { nullify, personName } from '@/lib/server/people';
import { serializeUnion } from '@/lib/server/serialize';
import { CreateUnionSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`union:create:${userId}`, LIMITS.create);

  const input = await parseBody(request, CreateUnionSchema);
  const [a, b] = input.partnerIds;
  if (a === b) throw ApiError.invalid('Pick two different people.');

  const partners = await prisma.person.findMany({
    where: { id: { in: input.partnerIds }, treeId },
    select: { id: true, givenName: true, familyName: true },
  });
  if (partners.length !== 2) throw ApiError.invalid('Both people must be in this tree.');

  const existing = await prisma.union.findFirst({
    where: { treeId, AND: input.partnerIds.map((id) => ({ partners: { some: { personId: id } } })) },
    select: { id: true },
  });
  if (existing) throw ApiError.conflict('These two are already recorded as a couple.');

  const { partnerIds, ...fields } = input;
  const union = await prisma.union.create({
    data: {
      ...nullify(fields),
      treeId,
      createdById: userId,
      partners: { create: partnerIds.map((personId) => ({ personId })) },
    },
    include: { partners: { select: { personId: true } } },
  });

  const subject = partners.map(personName).join(' & ');
  await recordEvent({
    treeId,
    actorId: userId,
    action: 'union.created',
    subject,
    payload: { unionId: union.id, partnerIds },
  });

  return ok(serializeUnion(union), 201);
});
