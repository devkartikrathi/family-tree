import { prisma } from '@/lib/db';
import { ApiError, ok, route } from '@/lib/server/api';
import { requireUser } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { inviteStatus } from '@/lib/server/trees';

type Context = { params: Promise<{ code: string }> };

const normalize = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

async function findInvite(code: string) {
  const invite = await prisma.invite.findUnique({
    where: { code: normalize(code) },
    include: {
      tree: { select: { id: true, name: true, description: true, _count: { select: { persons: true, members: true } } } },
      createdBy: { select: { name: true, image: true } },
    },
  });
  if (!invite) throw ApiError.notFound('That invite link is not valid.');
  return invite;
}

const REASONS: Record<string, string> = {
  REVOKED: 'This invite has been revoked.',
  EXPIRED: 'This invite has expired.',
  EXHAUSTED: 'This invite has already been used the maximum number of times.',
};

/** What the invitee sees before deciding: whose family, how big, who invited them. */
export const GET = route<Context>(async (_request, { params }) => {
  const { code } = await params;
  const user = await requireUser();
  const invite = await findInvite(code);
  const status = inviteStatus(invite);

  const membership = await prisma.membership.findUnique({
    where: { userId_treeId: { userId: user.id, treeId: invite.treeId } },
    select: { role: true },
  });

  return ok({
    code: invite.code,
    status,
    reason: REASONS[status] ?? null,
    role: invite.role,
    note: invite.note,
    tree: {
      id: invite.tree.id,
      name: invite.tree.name,
      description: invite.tree.description,
      personCount: invite.tree._count.persons,
      memberCount: invite.tree._count.members,
    },
    invitedBy: invite.createdBy,
    alreadyMember: Boolean(membership),
    currentRole: membership?.role ?? null,
  });
});

export const POST = route<Context>(async (_request, { params }) => {
  const { code } = await params;
  const user = await requireUser();
  consume(`invite:accept:${user.id}`, LIMITS.join);

  const invite = await findInvite(code);
  const status = inviteStatus(invite);
  if (status !== 'ACTIVE') throw ApiError.forbidden(REASONS[status] ?? 'This invite is no longer valid.');

  const existing = await prisma.membership.findUnique({
    where: { userId_treeId: { userId: user.id, treeId: invite.treeId } },
    select: { role: true },
  });
  if (existing) return ok({ treeId: invite.treeId, role: existing.role, alreadyMember: true });

  // Counting the use inside the transaction keeps a shared link from being
  // redeemed past its limit by two people clicking at once.
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.invite.findUniqueOrThrow({ where: { id: invite.id } });
    if (inviteStatus(fresh) !== 'ACTIVE') {
      throw ApiError.forbidden('This invite is no longer valid.');
    }
    await tx.invite.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } });
    await tx.membership.create({
      data: { treeId: invite.treeId, userId: user.id, role: invite.role },
    });
  });

  await recordEvent({
    treeId: invite.treeId,
    actorId: user.id,
    actorName: user.name,
    action: 'member.joined',
    subject: user.name ?? user.email,
    payload: { role: invite.role },
  });

  return ok({ treeId: invite.treeId, role: invite.role, alreadyMember: false }, 201);
});
