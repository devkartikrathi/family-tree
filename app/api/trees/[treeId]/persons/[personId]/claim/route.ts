import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { personName } from '@/lib/server/people';
import { ClaimPersonSchema } from '@/lib/domain/schemas';

type Context = { params: Promise<{ treeId: string; personId: string }> };

/**
 * "This is me." Claiming a person turns an abstract diagram into your own
 * position in it — every relationship label elsewhere in the app is then
 * phrased relative to you.
 */
export const POST = route<Context>(async (request, { params }) => {
  const { treeId, personId } = await params;
  const { userId } = await requireTreeAccess(treeId);
  consume(`person:claim:${userId}`, LIMITS.mutation);

  const { claim } = await parseBody(request, ClaimPersonSchema);

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    select: { id: true, givenName: true, familyName: true, claimedByUserId: true },
  });
  if (!person) throw ApiError.notFound('That person is not in this tree.');

  if (!claim) {
    if (person.claimedByUserId !== userId) {
      throw ApiError.forbidden('You can only unlink your own account.');
    }
    await prisma.person.update({ where: { id: personId }, data: { claimedByUserId: null } });
    return ok({ claimed: false });
  }

  if (person.claimedByUserId && person.claimedByUserId !== userId) {
    throw ApiError.conflict('Another member has already linked their account to this person.');
  }

  await prisma.$transaction([
    prisma.person.updateMany({
      where: { treeId, claimedByUserId: userId },
      data: { claimedByUserId: null },
    }),
    prisma.person.update({ where: { id: personId }, data: { claimedByUserId: userId } }),
  ]);

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'person.claimed',
    subject: personName(person),
    payload: { personId },
  });

  return ok({ claimed: true });
});
