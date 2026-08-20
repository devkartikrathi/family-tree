import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { nullify, personName } from '@/lib/server/people';
import { serializeUnion } from '@/lib/server/serialize';
import { UpdateUnionSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string; unionId: string }> };

async function loadUnion(treeId: string, unionId: string) {
  const union = await prisma.union.findFirst({
    where: { id: unionId, treeId },
    include: { partners: { include: { person: { select: { givenName: true, familyName: true } } } } },
  });
  if (!union) throw ApiError.notFound('That marriage record is no longer here.');
  return union;
}

export const PATCH = route<Context>(async (request, { params }) => {
  const { treeId, unionId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`union:update:${userId}`, LIMITS.mutation);

  const existing = await loadUnion(treeId, unionId);
  const input = await parseBody(request, UpdateUnionSchema);

  const union = await prisma.union.update({
    where: { id: unionId },
    data: nullify(input),
    include: { partners: { select: { personId: true } } },
  });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'union.updated',
    subject: existing.partners.map((p) => personName(p.person)).join(' & '),
    payload: { unionId, fields: Object.keys(input) },
  });

  return ok(serializeUnion(union));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const { treeId, unionId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`union:delete:${userId}`, LIMITS.create);

  const existing = await loadUnion(treeId, unionId);

  // Children keep both parents; they just stop being grouped under this couple.
  await prisma.union.delete({ where: { id: unionId } });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'union.deleted',
    subject: existing.partners.map((p) => personName(p.person)).join(' & '),
    payload: { unionId },
  });

  return ok({ deleted: true });
});
