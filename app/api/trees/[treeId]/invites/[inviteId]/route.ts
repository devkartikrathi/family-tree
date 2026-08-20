import { prisma } from '@/lib/db';
import { ApiError, ok, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { recordEvent } from '@/lib/server/events';

type Context = { params: Promise<{ treeId: string; inviteId: string }> };

export const DELETE = route<Context>(async (_request, { params }) => {
  const { treeId, inviteId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'ADMIN');

  const invite = await prisma.invite.findFirst({ where: { id: inviteId, treeId } });
  if (!invite) throw ApiError.notFound('That invite no longer exists.');

  await prisma.invite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'invite.revoked',
    subject: invite.note || `${invite.role.toLowerCase()} invite`,
  });

  return ok({ revoked: true });
});
