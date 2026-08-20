import { prisma } from '@/lib/db';
import { latestCursor } from './events';
import { serializeLink, serializePerson, serializeUnion } from './serialize';
import type { Invite, Member, PresenceUser, Role, Tree, TreeGraph, TreeSummary } from '@/lib/domain/types';

const PRESENCE_WINDOW_MS = 90_000;

export function serializeTree(row: {
  id: string;
  name: string;
  description: string | null;
  accent: string | null;
  layoutMode: 'AUTO' | 'FREEFORM';
  protectLiving: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Tree {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** The full graph for one tree, redacted for the caller's role. */
export async function loadTreeGraph(treeId: string, role: Role): Promise<TreeGraph> {
  const [tree, persons, unions, links, cursor] = await Promise.all([
    prisma.tree.findUniqueOrThrow({ where: { id: treeId } }),
    prisma.person.findMany({ where: { treeId }, orderBy: { createdAt: 'asc' } }),
    prisma.union.findMany({
      where: { treeId },
      include: { partners: { select: { personId: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.parentChild.findMany({ where: { treeId } }),
    latestCursor(treeId),
  ]);

  return {
    tree: serializeTree(tree),
    role,
    persons: persons.map((person) => serializePerson(person, role, tree.protectLiving)),
    unions: unions.map(serializeUnion),
    links: links.map(serializeLink),
    cursor,
  };
}

export async function listTreesForUser(userId: string): Promise<TreeSummary[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    select: {
      role: true,
      tree: {
        select: {
          id: true,
          name: true,
          description: true,
          accent: true,
          layoutMode: true,
          protectLiving: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { persons: true, members: true } },
          events: { orderBy: { id: 'desc' }, take: 1, select: { createdAt: true } },
        },
      },
    },
  });

  return memberships.map(({ role, tree }) => ({
    ...serializeTree(tree),
    role: role as Role,
    personCount: tree._count.persons,
    memberCount: tree._count.members,
    lastActivityAt: tree.events[0]?.createdAt.toISOString() ?? null,
  }));
}

export async function listMembers(treeId: string): Promise<Member[]> {
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);

  const [members, online, claims] = await Promise.all([
    prisma.membership.findMany({
      where: { treeId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.presence.findMany({
      where: { treeId, lastSeenAt: { gte: since } },
      select: { userId: true },
    }),
    prisma.person.findMany({
      where: { treeId, claimedByUserId: { not: null } },
      select: { id: true, claimedByUserId: true },
    }),
  ]);

  const onlineIds = new Set(online.map((p) => p.userId));
  const claimByUser = new Map(claims.map((c) => [c.claimedByUserId!, c.id]));
  const rank: Record<Role, number> = { CREATOR: 0, ADMIN: 1, EDITOR: 2, VIEWER: 3 };

  return members
    .map((member) => ({
      id: member.id,
      userId: member.userId,
      treeId: member.treeId,
      role: member.role as Role,
      joinedAt: member.joinedAt.toISOString(),
      user: member.user,
      online: onlineIds.has(member.userId),
      personId: claimByUser.get(member.userId) ?? null,
    }))
    .sort((a, b) => rank[a.role] - rank[b.role] || a.joinedAt.localeCompare(b.joinedAt));
}

export async function listPresence(treeId: string): Promise<PresenceUser[]> {
  const rows = await prisma.presence.findMany({
    where: { treeId, lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) } },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { lastSeenAt: 'desc' },
  });

  return rows.map((row) => ({
    userId: row.userId,
    name: row.user.name,
    image: row.user.image,
    lastSeenAt: row.lastSeenAt.toISOString(),
  }));
}

export function inviteStatus(invite: {
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}): Invite['status'] {
  if (invite.revokedAt) return 'REVOKED';
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return 'EXPIRED';
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return 'EXHAUSTED';
  return 'ACTIVE';
}

export async function listInvites(treeId: string): Promise<Invite[]> {
  const rows = await prisma.invite.findMany({
    where: { treeId },
    include: { createdBy: { select: { name: true, image: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    treeId: row.treeId,
    code: row.code,
    role: row.role as Role,
    note: row.note,
    maxUses: row.maxUses,
    useCount: row.useCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    status: inviteStatus(row),
  }));
}

/** Unambiguous invite codes: no 0/O, no 1/I/L. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}
