import { ok, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { listMembers } from '@/lib/server/trees';

type Context = { params: Promise<{ treeId: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId);
  return ok(await listMembers(treeId));
});
