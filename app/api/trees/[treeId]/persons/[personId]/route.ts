import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { deletePerson, nullify, personName } from '@/lib/server/people';
import { serializePerson } from '@/lib/server/serialize';
import { UpdatePersonSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string; personId: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { treeId, personId } = await params;
  const { role, tree } = await requireTreeAccess(treeId);

  const person = await prisma.person.findFirst({ where: { id: personId, treeId } });
  if (!person) throw ApiError.notFound('That person is not in this tree.');

  return ok(serializePerson(person, role, tree.protectLiving));
});

export const PATCH = route<Context>(async (request, { params }) => {
  const { treeId, personId } = await params;
  const { role, userId, tree } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`person:update:${userId}`, LIMITS.mutation);

  const input = await parseBody(request, UpdatePersonSchema);

  const existing = await prisma.person.findFirst({ where: { id: personId, treeId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('That person is not in this tree.');

  const person = await prisma.person.update({
    where: { id: personId },
    data: nullify(input),
  });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'person.updated',
    subject: personName(person),
    payload: { personId, fields: Object.keys(input) },
  });

  return ok(serializePerson(person, role, tree.protectLiving));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const { treeId, personId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'EDITOR');
  consume(`person:delete:${userId}`, LIMITS.create);

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    select: { givenName: true, familyName: true },
  });
  if (!person) throw ApiError.notFound('That person is not in this tree.');

  await deletePerson(treeId, personId);

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'person.deleted',
    subject: personName(person),
    payload: { personId },
  });

  return ok({ deleted: true });
});
