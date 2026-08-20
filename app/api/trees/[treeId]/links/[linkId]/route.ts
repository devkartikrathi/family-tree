import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { personName } from '@/lib/server/people';
import { serializeLink } from '@/lib/server/serialize';
import { UpdateLinkSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string; linkId: string }> };

async function loadLink(treeId: string, linkId: string) {
  const link = await prisma.parentChild.findFirst({
    where: { id: linkId, treeId },
    include: {
      parent: { select: { givenName: true, familyName: true } },
      child: { select: { givenName: true, familyName: true } },
    },
  });
  if (!link) throw ApiError.notFound('That connection no longer exists.');
  return link;
}

export const PATCH = route<Context>(async (request, { params }) => {
  const { treeId, linkId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`link:update:${userId}`, LIMITS.mutation);

  const existing = await loadLink(treeId, linkId);
  const input = await parseBody(request, UpdateLinkSchema);

  const link = await prisma.parentChild.update({
    where: { id: linkId },
    data: {
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.unionId !== undefined ? { unionId: input.unionId ?? null } : {}),
    },
  });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'link.updated',
    subject: `${personName(existing.parent)} → ${personName(existing.child)}`,
    payload: { linkId },
  });

  return ok(serializeLink(link));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const { treeId, linkId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`link:delete:${userId}`, LIMITS.mutation);

  const existing = await loadLink(treeId, linkId);
  await prisma.parentChild.delete({ where: { id: linkId } });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'link.deleted',
    subject: `${personName(existing.parent)} → ${personName(existing.child)}`,
    payload: { linkId },
  });

  return ok({ deleted: true });
});
