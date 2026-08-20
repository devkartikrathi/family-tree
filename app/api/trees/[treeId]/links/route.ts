import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { assertNoAncestryCycle, personName } from '@/lib/server/people';
import { serializeLink } from '@/lib/server/serialize';
import { CreateLinkSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`link:create:${userId}`, LIMITS.create);

  const input = await parseBody(request, CreateLinkSchema);

  const people = await prisma.person.findMany({
    where: { id: { in: [input.parentId, input.childId] }, treeId },
    select: { id: true, givenName: true, familyName: true },
  });
  if (people.length !== 2) throw ApiError.invalid('Both people must be in this tree.');

  await assertNoAncestryCycle(treeId, input.parentId, input.childId);

  const existing = await prisma.parentChild.findUnique({
    where: { childId_parentId: { childId: input.childId, parentId: input.parentId } },
  });
  if (existing) throw ApiError.conflict('That parent is already recorded for this person.');

  const link = await prisma.parentChild.create({
    data: {
      treeId,
      parentId: input.parentId,
      childId: input.childId,
      unionId: input.unionId ?? null,
      kind: input.kind,
      createdById: userId,
    },
  });

  const parent = people.find((p) => p.id === input.parentId)!;
  const child = people.find((p) => p.id === input.childId)!;

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'link.created',
    subject: `${personName(parent)} → ${personName(child)}`,
    payload: { linkId: link.id },
  });

  return ok(serializeLink(link), 201);
});
