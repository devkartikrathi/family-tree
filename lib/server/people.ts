import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ApiError } from './api';
import type { CreatePersonInput } from '@/lib/domain/schemas';

type Tx = Prisma.TransactionClient;

/** Empty strings arrive from the form; the database should hold nulls. */
export function nullify<T extends Record<string, unknown>>(input: T): T {
  const output = { ...input };
  for (const [key, value] of Object.entries(output)) {
    if (value === '') (output as Record<string, unknown>)[key] = null;
  }
  return output;
}

export function personName(person: { givenName: string; familyName?: string | null }): string {
  return [person.givenName, person.familyName].filter(Boolean).join(' ').trim() || 'Unnamed';
}

/**
 * Adding somebody is nearly always adding them *to* somebody: "her mother",
 * "their second child", "his wife". Doing the person and the relationship in
 * one transaction is what lets the UI say that instead of asking for a UUID.
 */
export async function createPersonWithRelation(
  treeId: string,
  input: CreatePersonInput,
  actorId: string,
): Promise<{ personId: string; createdUnionId: string | null }> {
  const { relateTo, ...fields } = input;

  return prisma.$transaction(async (tx) => {
    const anchor = relateTo
      ? await tx.person.findFirst({
          where: { id: relateTo.personId, treeId },
          select: { id: true },
        })
      : null;

    if (relateTo && !anchor) {
      throw ApiError.invalid('The person you are relating to is not in this tree.');
    }

    const person = await tx.person.create({
      data: { ...nullify(fields), treeId, createdById: actorId } as Prisma.PersonUncheckedCreateInput,
      select: { id: true },
    });

    let createdUnionId: string | null = null;

    if (relateTo && anchor) {
      switch (relateTo.as) {
        case 'parent': {
          await tx.parentChild.create({
            data: {
              treeId,
              parentId: person.id,
              childId: anchor.id,
              kind: relateTo.parentKind,
              createdById: actorId,
            },
          });
          break;
        }

        case 'child': {
          // When the child belongs to a known union, link *both* partners so
          // the canvas can hang the whole sibling group off one couple.
          const parentIds = relateTo.unionId
            ? (
                await tx.unionPartner.findMany({
                  where: { unionId: relateTo.unionId, union: { treeId } },
                  select: { personId: true },
                })
              ).map((p) => p.personId)
            : [anchor.id];

          if (!parentIds.includes(anchor.id)) parentIds.push(anchor.id);

          await tx.parentChild.createMany({
            data: parentIds.map((parentId) => ({
              treeId,
              parentId,
              childId: person.id,
              unionId: relateTo.unionId ?? null,
              kind: relateTo.parentKind,
              createdById: actorId,
            })),
            skipDuplicates: true,
          });
          break;
        }

        case 'partner': {
          const union = await tx.union.create({
            data: {
              treeId,
              kind: relateTo.unionKind,
              createdById: actorId,
              partners: { create: [{ personId: anchor.id }, { personId: person.id }] },
            },
            select: { id: true },
          });
          createdUnionId = union.id;
          break;
        }

        case 'sibling': {
          const parentLinks = await tx.parentChild.findMany({
            where: { childId: anchor.id, treeId },
            select: { parentId: true, unionId: true, kind: true },
          });

          if (parentLinks.length === 0) {
            throw ApiError.invalid(
              'Add a parent first — siblings are recorded by sharing parents.',
            );
          }

          await tx.parentChild.createMany({
            data: parentLinks.map((link) => ({
              treeId,
              parentId: link.parentId,
              childId: person.id,
              unionId: link.unionId,
              kind: link.kind,
              createdById: actorId,
            })),
            skipDuplicates: true,
          });
          break;
        }
      }
    }

    return { personId: person.id, createdUnionId };
  });
}

/**
 * Removing a person leaves the graph tidy: their links go with them (cascade),
 * and any marriage that is now a marriage of one is removed too.
 */
export async function deletePerson(treeId: string, personId: string): Promise<void> {
  await prisma.$transaction(async (tx: Tx) => {
    const person = await tx.person.findFirst({ where: { id: personId, treeId }, select: { id: true } });
    if (!person) throw ApiError.notFound('That person is no longer in this tree.');

    const unionIds = (
      await tx.unionPartner.findMany({ where: { personId }, select: { unionId: true } })
    ).map((row) => row.unionId);

    await tx.person.delete({ where: { id: personId } });

    if (unionIds.length > 0) {
      const survivors = await tx.unionPartner.groupBy({
        by: ['unionId'],
        where: { unionId: { in: unionIds } },
        _count: { personId: true },
      });
      const stillPaired = new Set(
        survivors.filter((row) => row._count.personId >= 2).map((row) => row.unionId),
      );
      const orphaned = unionIds.filter((id) => !stillPaired.has(id));
      if (orphaned.length > 0) {
        await tx.union.deleteMany({ where: { id: { in: orphaned }, treeId } });
      }
    }
  });
}

/** Guards against the one edit that can corrupt a tree: a cycle in the ancestry. */
export async function assertNoAncestryCycle(
  treeId: string,
  parentId: string,
  childId: string,
): Promise<void> {
  if (parentId === childId) {
    throw ApiError.invalid('A person cannot be their own parent.');
  }

  const links = await prisma.parentChild.findMany({
    where: { treeId },
    select: { parentId: true, childId: true },
  });

  const childrenOf = new Map<string, string[]>();
  for (const link of links) {
    const list = childrenOf.get(link.parentId);
    if (list) list.push(link.childId);
    else childrenOf.set(link.parentId, [link.childId]);
  }

  // If the proposed parent is already a descendant of the child, the new link
  // would close a loop.
  const seen = new Set([childId]);
  const stack = [childId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === parentId) {
      throw ApiError.invalid(
        'That would make someone their own ancestor. Check which way round the link goes.',
      );
    }
    for (const next of childrenOf.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
}
