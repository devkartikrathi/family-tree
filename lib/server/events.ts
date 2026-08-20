import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActivityEvent } from '@/lib/domain/types';

/**
 * The append-only event log does triple duty: the activity feed members read,
 * the audit trail admins can inspect, and the cursor the live stream polls.
 * Recording is best-effort — a failure here must never fail the mutation that
 * the user actually asked for.
 */
export type EventAction =
  | 'tree.created'
  | 'tree.updated'
  | 'tree.imported'
  | 'person.created'
  | 'person.updated'
  | 'person.deleted'
  | 'person.claimed'
  | 'union.created'
  | 'union.updated'
  | 'union.deleted'
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'member.left'
  | 'invite.created'
  | 'invite.revoked';

export interface RecordEventInput {
  treeId: string;
  actorId: string | null;
  actorName?: string | null;
  action: EventAction;
  subject: string;
  payload?: Record<string, unknown>;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    await prisma.treeEvent.create({
      data: {
        treeId: input.treeId,
        actorId: input.actorId,
        actorName: input.actorName ?? null,
        action: input.action,
        subject: input.subject.slice(0, 200),
        payload: (input.payload ?? undefined) as never,
      },
    });
  } catch (error) {
    logger.warn({ err: error, action: input.action }, 'Failed to record tree event');
  }
}

export async function latestCursor(treeId: string): Promise<number> {
  const latest = await prisma.treeEvent.findFirst({
    where: { treeId },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  return latest?.id ?? 0;
}

export async function eventsSince(treeId: string, cursor: number, take = 100): Promise<ActivityEvent[]> {
  const rows = await prisma.treeEvent.findMany({
    where: { treeId, id: { gt: cursor } },
    orderBy: { id: 'asc' },
    take,
  });
  return rows.map(serializeEvent);
}

export async function recentEvents(treeId: string, take = 60, before?: number): Promise<ActivityEvent[]> {
  const rows = await prisma.treeEvent.findMany({
    where: { treeId, ...(before ? { id: { lt: before } } : {}) },
    orderBy: { id: 'desc' },
    take,
  });
  return rows.map(serializeEvent);
}

function serializeEvent(row: {
  id: number;
  action: string;
  subject: string;
  actorId: string | null;
  actorName: string | null;
  payload: unknown;
  createdAt: Date;
}): ActivityEvent {
  return {
    id: row.id,
    action: row.action,
    subject: row.subject,
    actorId: row.actorId,
    actorName: row.actorName,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
