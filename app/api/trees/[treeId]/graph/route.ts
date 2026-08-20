import { ok, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { loadTreeGraph } from '@/lib/server/trees';

type Context = { params: Promise<{ treeId: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  const { role } = await requireTreeAccess(treeId);
  return ok(await loadTreeGraph(treeId, role));
});
