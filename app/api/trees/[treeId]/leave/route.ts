import { prisma } from '@/lib/db';
import { ApiError, ok, route } from '@/lib/server/api';
import { requireTreeAccess, requireUser } from '@/lib/server/auth';
import { recordEvent } from '@/lib/server/events';

type Context = { params: Promise<{ treeId: string }> };

export const POST = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  const { role } = await requireTreeAccess(treeId);
  const user = await requireUser();

  if (role === 'CREATOR') {
    throw ApiError.forbidden(
      'You created this tree. Hand it over to another admin first, or delete it.',
    );
  }

  await prisma.membership.delete({ where: { userId_treeId: { userId: user.id, treeId } } });
  await prisma.person.updateMany({
    where: { treeId, claimedByUserId: user.id },
    data: { claimedByUserId: null },
  });

  await recordEvent({
    treeId,
    actorId: user.id,
    action: 'member.left',
    subject: user.name ?? user.email,
  });

  return ok({ left: true });
});
