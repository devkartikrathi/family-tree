import { ok, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { recentEvents } from '@/lib/server/events';

type Context = { params: Promise<{ treeId: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId);

  const url = new URL(request.url);
  const before = Number(url.searchParams.get('before')) || undefined;
  const take = Math.min(Number(url.searchParams.get('take')) || 40, 100);

  const events = await recentEvents(treeId, take, before);
  return ok({ events, nextCursor: events.length === take ? events[events.length - 1].id : null });
});
