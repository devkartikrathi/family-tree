import { redirect } from 'next/navigation';
import { ensureUser } from '@/lib/server/auth';

/**
 * The one place the Clerk profile is mirrored into our own tables, so members
 * lists and activity entries can show a real name without calling out to Clerk
 * on every render.
 */
export default async function TreeLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUser();
  if (!user) redirect('/');
  return <>{children}</>;
}
