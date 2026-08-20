import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { Workspace } from '@/components/tree/workspace';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ treeId: string }>;
}): Promise<Metadata> {
  const { treeId } = await params;
  const tree = await prisma.tree.findUnique({ where: { id: treeId }, select: { name: true } });
  return {
    title: tree?.name ?? 'Family tree',
    robots: { index: false, follow: false },
  };
}

export default function TreeWorkspacePage() {
  return <Workspace />;
}
