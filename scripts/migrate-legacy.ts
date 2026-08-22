/**
 * Copies a v1 family tree into the v2 schema.
 *
 *   bun run migrate:legacy            # dry run — reports what it would do
 *   bun run migrate:legacy --apply    # write the converted records
 *   bun run migrate:legacy --apply --drop-legacy
 *
 * v1 kept a *couple* in one node, with the parents of each half referenced by
 * a UUID inside the node's JSON. v2 keeps one row per person. So each v1 node
 * becomes one or two people plus (when there was a spouse) a marriage, and each
 * `primaryRootNodeId` / `spouseRootNodeId` becomes real parent→child links to
 * both halves of the parents' node.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const DROP_LEGACY = process.argv.includes('--drop-legacy');

interface LegacyPerson {
  name?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  alive?: boolean;
  birthLocation?: string;
  deathLocation?: string;
  occupation?: string;
  notes?: string;
  state?: string;
  pincode?: string;
  latitude?: string | number;
  longitude?: string | number;
}

interface LegacyNodeData {
  primary: LegacyPerson;
  spouse?: LegacyPerson;
  familySurname?: string;
  primaryRootNodeId?: string;
  spouseRootNodeId?: string;
}

interface LegacyNode {
  id: string;
  familyId: string;
  data: LegacyNodeData;
  positionX: number;
  positionY: number;
  createdAt: Date;
}

const ROLE_MAP: Record<string, 'CREATOR' | 'ADMIN' | 'EDITOR' | 'VIEWER'> = {
  CREATOR: 'CREATOR',
  ADMIN: 'ADMIN',
  // v1 "members" could not edit through the UI, so view-only is the honest
  // translation. Admins can promote anyone who should be editing.
  MEMBER: 'VIEWER',
};

function splitName(raw: string | undefined, surnameHint?: string) {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return { givenName: 'Unknown', familyName: surnameHint?.trim() || null };

  const parts = name.split(' ');
  if (parts.length === 1) return { givenName: parts[0], familyName: surnameHint?.trim() || null };
  return { givenName: parts.slice(0, -1).join(' '), familyName: parts[parts.length - 1] };
}

function cleanDate(value?: string): string | null {
  if (!value) return null;
  const iso = value.trim().match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (iso) return iso[0];
  const year = value.match(/(1[6-9]\d{2}|20\d{2})/);
  return year ? year[1] : null;
}

function toNumber(value?: string | number): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function residence(person: LegacyPerson): string | null {
  return [person.state?.trim(), person.pincode?.trim()].filter(Boolean).join(' ') || null;
}

function toPersonData(person: LegacyPerson, surnameHint: string | undefined, treeId: string) {
  const { givenName, familyName } = splitName(person.name, surnameHint);
  const alive = person.alive ?? true;

  return {
    treeId,
    givenName,
    familyName,
    sex: 'UNKNOWN' as const,
    birthDate: cleanDate(person.dateOfBirth),
    birthPlace: person.birthLocation?.trim() || null,
    isLiving: alive,
    deathDate: alive ? null : cleanDate(person.dateOfDeath),
    deathPlace: alive ? null : person.deathLocation?.trim() || null,
    residencePlace: residence(person),
    residenceLat: toNumber(person.latitude),
    residenceLng: toNumber(person.longitude),
    occupation: person.occupation?.trim() || null,
    bio: person.notes?.trim() || null,
  };
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = $1) AS exists`,
    name,
  );
  return rows[0]?.exists ?? false;
}

async function main() {
  if (!(await tableExists('legacy_v1_family_nodes'))) {
    console.log('No v1 data found. Nothing to migrate.');
    return;
  }

  const [users, families, members, nodes] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; email: string; name: string | null; image: string | null; createdAt: Date }[]>(
      'SELECT id, email, name, image, "createdAt" FROM legacy_v1_users',
    ),
    prisma.$queryRawUnsafe<{ id: string; name: string; createdAt: Date; userId: string | null }[]>(
      'SELECT id, name, "createdAt", "userId" FROM legacy_v1_families',
    ),
    prisma.$queryRawUnsafe<{ userId: string; familyId: string; role: string; joinedAt: Date }[]>(
      'SELECT "userId", "familyId", role::text AS role, "joinedAt" FROM legacy_v1_family_members',
    ),
    prisma.$queryRawUnsafe<LegacyNode[]>(
      'SELECT id, "familyId", data, "positionX", "positionY", "createdAt" FROM legacy_v1_family_nodes',
    ),
  ]);

  const membersByFamily = new Map<string, typeof members>();
  for (const member of members) {
    const list = membersByFamily.get(member.familyId);
    if (list) list.push(member);
    else membersByFamily.set(member.familyId, [member]);
  }

  const nodesByFamily = new Map<string, LegacyNode[]>();
  for (const node of nodes) {
    const list = nodesByFamily.get(node.familyId);
    if (list) list.push(node);
    else nodesByFamily.set(node.familyId, [node]);
  }

  const summary = { trees: 0, persons: 0, unions: 0, links: 0, skipped: [] as string[] };

  for (const family of families) {
    const familyMembers = membersByFamily.get(family.id) ?? [];
    const owner =
      family.userId ??
      familyMembers.find((m) => m.role === 'CREATOR')?.userId ??
      familyMembers[0]?.userId;

    if (!owner) {
      summary.skipped.push(`${family.name} (no owner or members)`);
      continue;
    }

    const familyNodes = nodesByFamily.get(family.id) ?? [];
    summary.trees += 1;

    if (!APPLY) {
      const spouses = familyNodes.filter((n) => n.data?.spouse?.name).length;
      summary.persons += familyNodes.length + spouses;
      summary.unions += spouses;
      summary.links += familyNodes.filter(
        (n) => n.data?.primaryRootNodeId || n.data?.spouseRootNodeId,
      ).length;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        await tx.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            createdAt: user.createdAt,
          },
        });
      }

      await tx.tree.create({
        data: {
          id: family.id,
          name: family.name,
          createdAt: family.createdAt,
          createdById: owner,
        },
      });

      const seenMembers = new Set<string>();
      for (const member of familyMembers) {
        if (seenMembers.has(member.userId)) continue;
        seenMembers.add(member.userId);
        await tx.membership.create({
          data: {
            treeId: family.id,
            userId: member.userId,
            role: ROLE_MAP[member.role] ?? 'VIEWER',
            joinedAt: member.joinedAt,
          },
        });
      }
      if (!seenMembers.has(owner)) {
        await tx.membership.create({ data: { treeId: family.id, userId: owner, role: 'CREATOR' } });
      }

      // Pass 1: every v1 node becomes one or two people, plus their marriage.
      const primaryOf = new Map<string, string>();
      const spouseOf = new Map<string, string>();
      const unionOf = new Map<string, string>();

      for (const node of familyNodes) {
        const data = node.data ?? ({} as LegacyNodeData);
        const surname = data.familySurname;

        const primary = await tx.person.create({
          data: {
            ...toPersonData(data.primary ?? {}, surname, family.id),
            createdById: owner,
          },
          select: { id: true },
        });
        primaryOf.set(node.id, primary.id);
        summary.persons += 1;

        if (data.spouse?.name) {
          const spouse = await tx.person.create({
            data: {
              ...toPersonData(data.spouse, surname, family.id),
              createdById: owner,
            },
            select: { id: true },
          });
          spouseOf.set(node.id, spouse.id);
          summary.persons += 1;

          const union = await tx.union.create({
            data: {
              treeId: family.id,
              kind: 'MARRIAGE',
              status: 'UNKNOWN',
              createdById: owner,
              partners: { create: [{ personId: primary.id }, { personId: spouse.id }] },
            },
            select: { id: true },
          });
          unionOf.set(node.id, union.id);
          summary.unions += 1;
        }
      }

      // Pass 2: a v1 "root node id" pointed at the *couple* who were the
      // parents, so it becomes a link from each half of that couple.
      const linkChildToNode = async (childId: string, parentNodeId: string) => {
        const parents = [primaryOf.get(parentNodeId), spouseOf.get(parentNodeId)].filter(
          (id): id is string => Boolean(id),
        );
        if (parents.length === 0) return;

        const result = await tx.parentChild.createMany({
          data: parents.map((parentId) => ({
            treeId: family.id,
            parentId,
            childId,
            unionId: unionOf.get(parentNodeId) ?? null,
            kind: 'BIOLOGICAL' as const,
            createdById: owner,
          })),
          skipDuplicates: true,
        });
        summary.links += result.count;
      };

      for (const node of familyNodes) {
        const data = node.data ?? ({} as LegacyNodeData);
        const primaryId = primaryOf.get(node.id);
        const spouseId = spouseOf.get(node.id);

        if (data.primaryRootNodeId && primaryId && primaryOf.has(data.primaryRootNodeId)) {
          await linkChildToNode(primaryId, data.primaryRootNodeId);
        }
        if (data.spouseRootNodeId && spouseId && primaryOf.has(data.spouseRootNodeId)) {
          await linkChildToNode(spouseId, data.spouseRootNodeId);
        }
      }

      await tx.treeEvent.create({
        data: {
          treeId: family.id,
          actorId: owner,
          action: 'tree.imported',
          subject: `${familyNodes.length} records from the previous version`,
        },
      });
    }, { timeout: 180_000 });
  }

  console.log(APPLY ? '\nMigrated:' : '\nDry run — would migrate:');
  console.log(`  trees    ${summary.trees}`);
  console.log(`  people   ${summary.persons}`);
  console.log(`  unions   ${summary.unions}`);
  console.log(`  links    ${summary.links}`);
  if (summary.skipped.length > 0) {
    console.log(`  skipped  ${summary.skipped.length}`);
    for (const name of summary.skipped) console.log(`           - ${name}`);
  }
  if (!APPLY) console.log('\nRe-run with --apply to write these records.');

  if (APPLY && DROP_LEGACY) {
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS legacy_v1_family_edges CASCADE;
      DROP TABLE IF EXISTS legacy_v1_family_nodes CASCADE;
      DROP TABLE IF EXISTS legacy_v1_family_members CASCADE;
      DROP TABLE IF EXISTS legacy_v1_families CASCADE;
      DROP TABLE IF EXISTS legacy_v1_users CASCADE;
      DROP TYPE IF EXISTS legacy_v1_role CASCADE;
    `);
    console.log('\nDropped the legacy_v1_* tables.');
  }
}

main()
  .catch((error) => {
    console.error('\nMigration failed. Nothing was left half-written — each tree is one transaction.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
