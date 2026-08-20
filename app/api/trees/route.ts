import { prisma } from '@/lib/db';
import { ok, parseBody, route } from '@/lib/server/api';
import { requireUser, requireUserId } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { listTreesForUser, serializeTree } from '@/lib/server/trees';
import { CreateTreeSchema } from '@/lib/domain/schemas';

export const GET = route(async () => {
  const userId = await requireUserId();
  return ok(await listTreesForUser(userId));
});

export const POST = route(async (request) => {
  const user = await requireUser();
  consume(`tree:create:${user.id}`, LIMITS.create);

  const input = await parseBody(request, CreateTreeSchema);

  const tree = await prisma.tree.create({
    data: {
      name: input.name,
      description: input.description || null,
      createdById: user.id,
      members: { create: { userId: user.id, role: 'CREATOR' } },
    },
  });

  await recordEvent({
    treeId: tree.id,
    actorId: user.id,
    actorName: user.name,
    action: 'tree.created',
    subject: tree.name,
  });

  return ok(serializeTree(tree), 201);
});
