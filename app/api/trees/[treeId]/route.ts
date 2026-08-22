import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { can } from '@/lib/domain/permissions';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { serializeTree } from '@/lib/server/trees';
import { DeleteTreeSchema, UpdateTreeSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId } = await params;
  const { tree, role } = await requireTreeAccess(treeId);
  return ok({ ...serializeTree(tree), role });
});

export const PATCH = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { role, userId } = await requireTreeAccess(treeId);
  if (!can.manageSettings(role)) throw ApiError.forbidden('Only admins can change tree settings.');

  consume(`tree:update:${userId}`, LIMITS.mutation);
  const input = await parseBody(request, UpdateTreeSchema);

  const tree = await prisma.tree.update({
    where: { id: treeId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.accent !== undefined ? { accent: input.accent } : {}),
      ...(input.protectLiving !== undefined ? { protectLiving: input.protectLiving } : {}),
    },
  });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'tree.updated',
    subject: tree.name,
    payload: input as Record<string, unknown>,
  });

  return ok(serializeTree(tree));
});

export const DELETE = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { role, tree, userId } = await requireTreeAccess(treeId);
  if (!can.deleteTree(role)) throw ApiError.forbidden('Only the creator can delete this tree.');

  consume(`tree:delete:${userId}`, LIMITS.create);

  // Typing the name is the confirmation. Deleting a family archive by accident
  // is not a mistake anyone should be able to make in one click.
  const { confirm } = await parseBody(request, DeleteTreeSchema);
  if (confirm.trim() !== tree.name.trim()) {
    throw ApiError.invalid(`Type the tree's name exactly — "${tree.name}" — to confirm.`, {
      confirm: 'That name does not match.',
    });
  }

  await prisma.tree.delete({ where: { id: treeId } });
  return ok({ deleted: true });
});
