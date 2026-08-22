import type { ParentLink, Person, Sex, Union } from './types';

/**
 * Terse builders so a test can state a family in a few lines and spend its
 * attention on the assertion instead of the scaffolding.
 */
let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;

export function person(
  givenName: string,
  overrides: Partial<Person> & { id?: string } = {},
): Person {
  return {
    id: overrides.id ?? nextId('p'),
    treeId: 'tree',
    givenName,
    familyName: null,
    nickname: null,
    maidenName: null,
    sex: 'UNKNOWN' as Sex,
    birthDate: null,
    birthPlace: null,
    birthLat: null,
    birthLng: null,
    isLiving: true,
    deathDate: null,
    deathPlace: null,
    deathLat: null,
    deathLng: null,
    residencePlace: null,
    residenceLat: null,
    residenceLng: null,
    occupation: null,
    bio: null,
    photoUrl: null,
    claimedByUserId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function union(a: Person, b: Person, overrides: Partial<Union> = {}): Union {
  return {
    id: overrides.id ?? nextId('u'),
    treeId: 'tree',
    kind: 'MARRIAGE',
    status: 'CURRENT',
    startDate: null,
    endDate: null,
    place: null,
    note: null,
    partnerIds: [a.id, b.id],
    ...overrides,
  };
}

export function link(parent: Person, child: Person, viaUnion?: Union): ParentLink {
  return {
    id: nextId('l'),
    treeId: 'tree',
    parentId: parent.id,
    childId: child.id,
    unionId: viaUnion?.id ?? null,
    kind: 'BIOLOGICAL',
  };
}

/** Both partners of a union become parents of the child. */
export function childOf(couple: Union, parents: [Person, Person], child: Person): ParentLink[] {
  return parents.map((parent) => link(parent, child, couple));
}
