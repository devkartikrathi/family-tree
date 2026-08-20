import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/server/api';
import { requireTreeAccess, requireUser } from '@/lib/server/auth';
import { loadTreeGraph } from '@/lib/server/trees';
import { TreeProvider } from '@/lib/hooks/use-tree';

export const dynamic = 'force-dynamic';

/**
 * The whole graph is loaded once on the server and handed to the client store,
 * so the workspace paints with real content on first frame instead of a
 * spinner. Live updates take over from there.
 */
export default async function TreeWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ treeId: string }>;
}) {
  const { treeId } = await params;
  const user = await requireUser();

  try {
    const { role } = await requireTreeAccess(treeId);
    const graph = await loadTreeGraph(treeId, role);

    return (
      <TreeProvider initial={graph} meUserId={user.id}>
        {children}
      </TreeProvider>
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}
