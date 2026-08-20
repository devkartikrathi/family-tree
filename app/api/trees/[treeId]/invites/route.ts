import { prisma } from '@/lib/db';
import { ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess, requireUser } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { generateInviteCode, inviteStatus, listInvites } from '@/lib/server/trees';
import { CreateInviteSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId, 'ADMIN');
  return ok(await listInvites(treeId));
});

/**
 * Invitation is the only way in. There is no "join by tree id" — knowing an
 * identifier must never be the same as being welcome.
 */
export const POST = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  await requireTreeAccess(treeId, 'ADMIN');
  const user = await requireUser();
  consume(`invite:create:${user.id}`, LIMITS.invite);

  const input = await parseBody(request, CreateInviteSchema);

  const invite = await prisma.invite.create({
    data: {
      treeId,
      code: generateInviteCode(),
      role: input.role,
      note: input.note || null,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : null,
      createdById: user.id,
    },
    include: { createdBy: { select: { name: true, image: true } } },
  });

  await recordEvent({
    treeId,
    actorId: user.id,
    actorName: user.name,
    action: 'invite.created',
    subject: input.note || `${input.role.toLowerCase()} invite`,
  });

  return ok(
    {
      id: invite.id,
      treeId: invite.treeId,
      code: invite.code,
      role: invite.role,
      note: invite.note,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      revokedAt: null,
      createdAt: invite.createdAt.toISOString(),
      createdBy: invite.createdBy,
      status: inviteStatus(invite),
    },
    201,
  );
});
