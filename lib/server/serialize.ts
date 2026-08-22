import type { Person as PrismaPerson, Union as PrismaUnion, ParentChild } from '@prisma/client';
import type { Person, ParentLink, Role, Union } from '@/lib/domain/types';
import { shouldRedactLiving } from '@/lib/domain/permissions';

/**
 * Living-person privacy, enforced where it has to be: on the server, on the way
 * out. A viewer of a protected tree still sees who exists and how everyone is
 * connected — the shape of the family is the whole point — but the dates,
 * places and life stories of living people stay with the people who know them.
 */
export function serializePerson(
  row: PrismaPerson,
  role: Role,
  protectLiving: boolean,
): Person {
  const base: Person = {
    id: row.id,
    treeId: row.treeId,
    givenName: row.givenName,
    familyName: row.familyName,
    nickname: row.nickname,
    maidenName: row.maidenName,
    sex: row.sex,
    birthDate: row.birthDate,
    birthPlace: row.birthPlace,
    birthLat: row.birthLat,
    birthLng: row.birthLng,
    isLiving: row.isLiving,
    deathDate: row.deathDate,
    deathPlace: row.deathPlace,
    deathLat: row.deathLat,
    deathLng: row.deathLng,
    residencePlace: row.residencePlace,
    residenceLat: row.residenceLat,
    residenceLng: row.residenceLng,
    occupation: row.occupation,
    bio: row.bio,
    photoUrl: row.photoUrl,
    claimedByUserId: row.claimedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (!shouldRedactLiving(role, protectLiving, row.isLiving)) return base;

  return {
    ...base,
    birthDate: row.birthDate ? row.birthDate.slice(0, 4) : null,
    birthPlace: null,
    birthLat: null,
    birthLng: null,
    deathDate: null,
    deathPlace: null,
    deathLat: null,
    deathLng: null,
    residencePlace: null,
    residenceLat: null,
    residenceLng: null,
    occupation: null,
    bio: null,
    redacted: true,
  };
}

export function serializeUnion(
  row: PrismaUnion & { partners: { personId: string }[] },
): Union {
  return {
    id: row.id,
    treeId: row.treeId,
    kind: row.kind,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    place: row.place,
    note: row.note,
    partnerIds: row.partners.map((p) => p.personId),
  };
}

export function serializeLink(row: ParentChild): ParentLink {
  return {
    id: row.id,
    treeId: row.treeId,
    childId: row.childId,
    parentId: row.parentId,
    unionId: row.unionId,
    kind: row.kind,
  };
}
