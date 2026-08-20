import { prisma } from '@/lib/db';
import { ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { createPersonWithRelation, personName } from '@/lib/server/people';
import { serializePerson, serializeUnion } from '@/lib/server/serialize';
import { CreatePersonSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { role, userId, tree } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`person:create:${userId}`, LIMITS.create);

  const input = await parseBody(request, CreatePersonSchema);
  const { personId, createdUnionId } = await createPersonWithRelation(treeId, input, userId);

  const [person, union] = await Promise.all([
    prisma.person.findUniqueOrThrow({ where: { id: personId } }),
    createdUnionId
      ? prisma.union.findUnique({
          where: { id: createdUnionId },
          include: { partners: { select: { personId: true } } },
        })
      : Promise.resolve(null),
  ]);

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'person.created',
    subject: personName(person),
    payload: { personId, relatedAs: input.relateTo?.as ?? null },
  });

  return ok(
    {
      person: serializePerson(person, role, tree.protectLiving),
      union: union ? serializeUnion(union) : null,
    },
    201,
  );
});
