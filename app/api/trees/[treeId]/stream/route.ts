import { prisma } from '@/lib/db';
import { route } from '@/lib/server/api';
import { requireTreeAccess, requireUserId } from '@/lib/server/auth';
import { eventsSince } from '@/lib/server/events';
import { listPresence } from '@/lib/server/trees';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ treeId: string }> };

const POLL_MS = 2_500;
const PRESENCE_EVERY = 8; // polls, so roughly every 20s
const MAX_LIFETIME_MS = 240_000;

/**
 * Live collaboration over Server-Sent Events.
 *
 * The event log is already the source of truth for "what changed", so the
 * stream is just a cursor walk over it — no extra broker, no shared memory,
 * and it works fine on serverless because each connection owns its own cursor.
 * Connections retire after four minutes; EventSource reconnects on its own and
 * resumes from the cursor it last saw.
 */
export const GET = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId);
  const userId = await requireUserId();

  const url = new URL(request.url);
  let cursor = Number(url.searchParams.get('cursor')) || 0;

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener('abort', close);

      send('ready', { cursor });

      let tick = 0;
      const poll = async () => {
        if (closed) return;

        if (Date.now() - startedAt > MAX_LIFETIME_MS) {
          send('retire', { cursor });
          close();
          return;
        }

        try {
          const events = await eventsSince(treeId, cursor);
          if (events.length > 0) {
            cursor = events[events.length - 1].id;
            // Nobody needs a live echo of their own edits.
            const fromOthers = events.filter((event) => event.actorId !== userId);
            send('changes', { cursor, events: fromOthers, all: events.length });
          }

          if (tick % PRESENCE_EVERY === 0) {
            await prisma.presence.upsert({
              where: { treeId_userId: { treeId, userId } },
              update: { lastSeenAt: new Date() },
              create: { treeId, userId },
            });
            send('presence', await listPresence(treeId));
          }
        } catch {
          send('error', { message: 'Lost the connection to the tree. Retrying…' });
        }

        tick += 1;
        if (!closed) timer = setTimeout(poll, POLL_MS);
      };

      timer = setTimeout(poll, POLL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
