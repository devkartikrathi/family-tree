import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { can } from '@/lib/domain/permissions';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { UpdateMemberSchema } from '@/lib/domain/schemas';
import type { Role } from '@/lib/domain/types';

type Context = { params: Promise<{ treeId: string; userId: string }> };

async function loadTarget(treeId: string, targetUserId: string) {
  const member = await prisma.membership.findUnique({
    where: { userId_treeId: { userId: targetUserId, treeId } },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member) throw ApiError.notFound('That person is not a member of this tree.');
  return member;
}

/**
 * Admins manage editors and viewers. Only the creator can promote, demote or
 * remove another admin — so no admin can quietly lock the others out.
 */
function assertCanManage(actorRole: Role, targetRole: Role) {
  if (!can.manageMembers(actorRole)) throw ApiError.forbidden('Only admins can manage members.');
  if (targetRole === 'CREATOR') throw ApiError.forbidden("The creator's role cannot be changed.");
  if (targetRole === 'ADMIN' && actorRole !== 'CREATOR') {
    throw ApiError.forbidden('Only the creator can change another admin.');
  }
}

export const PATCH = route<Context>(async (request, { params }) => {
  const { treeId, userId: targetUserId } = await params;
  const { role, userId } = await requireTreeAccess(treeId, 'ADMIN');
  consume(`member:update:${userId}`, LIMITS.mutation);

  if (targetUserId === userId) throw ApiError.forbidden('You cannot change your own role.');

  const target = await loadTarget(treeId, targetUserId);
  assertCanManage(role, target.role as Role);

  const { role: nextRole } = await parseBody(request, UpdateMemberSchema);

  const updated = await prisma.membership.update({
    where: { userId_treeId: { userId: targetUserId, treeId } },
    data: { role: nextRole },
  });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'member.role_changed',
    subject: target.user.name ?? target.user.email,
    payload: { userId: targetUserId, from: target.role, to: nextRole },
  });

  return ok({ role: updated.role });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const { treeId, userId: targetUserId } = await params;
  const { role, userId } = await requireTreeAccess(treeId, 'ADMIN');
  consume(`member:remove:${userId}`, LIMITS.mutation);

  if (targetUserId === userId) {
    throw ApiError.forbidden('To remove yourself, leave the tree instead.');
  }

  const target = await loadTarget(treeId, targetUserId);
  assertCanManage(role, target.role as Role);

  await prisma.membership.delete({ where: { userId_treeId: { userId: targetUserId, treeId } } });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'member.removed',
    subject: target.user.name ?? target.user.email,
    payload: { userId: targetUserId },
  });

  return ok({ removed: true });
});
