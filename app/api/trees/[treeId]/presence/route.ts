import { prisma } from '@/lib/db';
import { ok, route } from '@/lib/server/api';
import { requireTreeAccess, requireUser } from '@/lib/server/auth';
import { listPresence } from '@/lib/server/trees';

type Context = { params: Promise<{ treeId: string }> };

/** Heartbeat. The client calls this while the tab is visible. */
export const POST = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId);
  const user = await requireUser();

  await prisma.presence.upsert({
    where: { treeId_userId: { treeId, userId: user.id } },
    update: { lastSeenAt: new Date() },
    create: { treeId, userId: user.id },
  });

  return ok(await listPresence(treeId));
});

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId);
  return ok(await listPresence(treeId));
});
