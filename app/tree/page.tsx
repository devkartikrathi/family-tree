import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import { TreeHome } from '@/components/tree/tree-home';
import { requireUser } from '@/lib/server/auth';
import { listTreesForUser } from '@/lib/server/trees';

export const metadata: Metadata = {
  title: 'Your trees',
  description: 'Every family tree you have started or been invited to.',
};

export const dynamic = 'force-dynamic';

export default async function TreesPage() {
  const user = await requireUser();
  const trees = await listTreesForUser(user.id);

  return (
    <div className="relative isolate min-h-screen">
      <AppHeader />
      <TreeHome trees={trees} firstName={user.name?.split(' ')[0] ?? null} />
    </div>
  );
}
