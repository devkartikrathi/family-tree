import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ApiError, ok, parseBody, route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { recordEvent } from '@/lib/server/events';
import { parseGedcom } from '@/lib/domain/gedcom';

type Context = { params: Promise<{ treeId: string }> };

const ImportBody = z.object({
  format: z.enum(['gedcom']).default('gedcom'),
  content: z.string().min(8).max(8_000_000),
});

const MAX_PERSONS = 5_000;

/**
 * Bring a family in from Ancestry, MyHeritage, Gramps or anything else that
 * speaks GEDCOM. Everything lands in one transaction, so a malformed file
 * leaves the tree exactly as it was.
 */
export const POST = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { userId } = await requireTreeAccess(treeId, 'ADMIN');
  consume(`import:${userId}`, LIMITS.create);

  const { content } = await parseBody(request, ImportBody);
  const parsed = parseGedcom(content);

  if (parsed.persons.length === 0) {
    throw ApiError.invalid('No individuals were found in that file.');
  }
  if (parsed.persons.length > MAX_PERSONS) {
    throw ApiError.invalid(`That file holds ${parsed.persons.length} people — the limit is ${MAX_PERSONS}.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const idByRef = new Map<string, string>();

    for (const person of parsed.persons) {
      const row = await tx.person.create({
        data: {
          treeId,
          createdById: userId,
          givenName: person.givenName,
          familyName: person.familyName,
          nickname: person.nickname,
          sex: person.sex,
          birthDate: person.birthDate,
          birthPlace: person.birthPlace,
          isLiving: person.isLiving,
          deathDate: person.deathDate,
          deathPlace: person.deathPlace,
          residencePlace: person.residencePlace,
          occupation: person.occupation,
          bio: person.bio,
        },
        select: { id: true },
      });
      idByRef.set(person.ref, row.id);
    }

    let unions = 0;
    let links = 0;

    for (const family of parsed.families) {
      const partnerIds = [family.husbandRef, family.wifeRef]
        .map((ref) => (ref ? idByRef.get(ref) : undefined))
        .filter((id): id is string => Boolean(id));

      let unionId: string | null = null;
      if (partnerIds.length === 2) {
        const union = await tx.union.create({
          data: {
            treeId,
            createdById: userId,
            kind: 'MARRIAGE',
            status: family.divorced ? 'DIVORCED' : 'UNKNOWN',
            startDate: family.marriageDate,
            place: family.marriagePlace,
            partners: { create: partnerIds.map((personId) => ({ personId })) },
          },
          select: { id: true },
        });
        unionId = union.id;
        unions += 1;
      }

      for (const childRef of family.childRefs) {
        const childId = idByRef.get(childRef);
        if (!childId) continue;
        const result = await tx.parentChild.createMany({
          data: partnerIds.map((parentId) => ({
            treeId,
            parentId,
            childId,
            unionId,
            kind: 'BIOLOGICAL' as const,
            createdById: userId,
          })),
          skipDuplicates: true,
        });
        links += result.count;
      }
    }

    return { persons: parsed.persons.length, unions, links };
  }, { timeout: 120_000 });

  await recordEvent({
    treeId,
    actorId: userId,
    action: 'tree.imported',
    subject: `${created.persons} people from a GEDCOM file`,
    payload: created,
  });

  return ok({ ...created, warnings: parsed.warnings }, 201);
});
