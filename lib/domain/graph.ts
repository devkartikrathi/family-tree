import type { ParentLink, Person, TreeGraph, Union } from './types';
import { comparePartialDates, yearOf } from './dates';

/**
 * An in-memory index over a tree. Built once per graph load and reused by the
 * canvas, the map, the timeline, search, and the relationship calculator, so
 * none of them has to re-derive adjacency from flat arrays.
 */
export interface GraphIndex {
  persons: Person[];
  unions: Union[];
  links: ParentLink[];

  personById: Map<string, Person>;
  unionById: Map<string, Union>;

  /** Unions this person is a partner in, oldest first. */
  unionsOf: Map<string, Union[]>;
  /** Links where this person is the child. */
  parentLinksOf: Map<string, ParentLink[]>;
  /** Links where this person is a parent. */
  childLinksOf: Map<string, ParentLink[]>;
  /** Children attributed to a union, sorted by birth. */
  childrenOfUnion: Map<string, string[]>;
}

export function buildIndex(graph: Pick<TreeGraph, 'persons' | 'unions' | 'links'>): GraphIndex {
  const { persons, unions, links } = graph;

  const personById = new Map(persons.map((p) => [p.id, p]));
  const unionById = new Map(unions.map((u) => [u.id, u]));

  const unionsOf = new Map<string, Union[]>();
  const parentLinksOf = new Map<string, ParentLink[]>();
  const childLinksOf = new Map<string, ParentLink[]>();
  const childrenOfUnion = new Map<string, string[]>();

  const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };

  for (const union of unions) {
    for (const personId of union.partnerIds) push(unionsOf, personId, union);
  }

  for (const link of links) {
    push(parentLinksOf, link.childId, link);
    push(childLinksOf, link.parentId, link);
    if (link.unionId) {
      const existing = childrenOfUnion.get(link.unionId);
      if (existing) {
        if (!existing.includes(link.childId)) existing.push(link.childId);
      } else {
        childrenOfUnion.set(link.unionId, [link.childId]);
      }
    }
  }

  const byBirth = (a: string, b: string) =>
    comparePartialDates(personById.get(a)?.birthDate, personById.get(b)?.birthDate);

  for (const [unionId, children] of childrenOfUnion) {
    childrenOfUnion.set(unionId, children.sort(byBirth));
  }
  for (const [personId, list] of unionsOf) {
    unionsOf.set(
      personId,
      list.slice().sort((a, b) => comparePartialDates(a.startDate, b.startDate)),
    );
  }

  return {
    persons,
    unions,
    links,
    personById,
    unionById,
    unionsOf,
    parentLinksOf,
    childLinksOf,
    childrenOfUnion,
  };
}

// ---------------------------------------------------------------------------
// Derived queries
// ---------------------------------------------------------------------------

export function parentsOf(index: GraphIndex, personId: string): Person[] {
  return (index.parentLinksOf.get(personId) ?? [])
    .map((link) => index.personById.get(link.parentId))
    .filter((p): p is Person => Boolean(p));
}

export function childrenOf(index: GraphIndex, personId: string): Person[] {
  const seen = new Set<string>();
  const children: Person[] = [];
  for (const link of index.childLinksOf.get(personId) ?? []) {
    if (seen.has(link.childId)) continue;
    seen.add(link.childId);
    const child = index.personById.get(link.childId);
    if (child) children.push(child);
  }
  return children.sort((a, b) => comparePartialDates(a.birthDate, b.birthDate));
}

export function partnersOf(index: GraphIndex, personId: string): Person[] {
  const partners: Person[] = [];
  const seen = new Set<string>();
  for (const union of index.unionsOf.get(personId) ?? []) {
    for (const otherId of union.partnerIds) {
      if (otherId === personId || seen.has(otherId)) continue;
      seen.add(otherId);
      const partner = index.personById.get(otherId);
      if (partner) partners.push(partner);
    }
  }
  return partners;
}

export interface Sibling {
  person: Person;
  /** Shares both known parents, or only one. */
  degree: 'full' | 'half';
}

export function siblingsOf(index: GraphIndex, personId: string): Sibling[] {
  const myParents = new Set((index.parentLinksOf.get(personId) ?? []).map((l) => l.parentId));
  if (myParents.size === 0) return [];

  const counts = new Map<string, number>();
  for (const parentId of myParents) {
    for (const link of index.childLinksOf.get(parentId) ?? []) {
      if (link.childId === personId) continue;
      counts.set(link.childId, (counts.get(link.childId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, shared]) => {
      const person = index.personById.get(id);
      if (!person) return null;
      const theirParents = new Set((index.parentLinksOf.get(id) ?? []).map((l) => l.parentId));
      const bothHaveTwo = myParents.size >= 2 && theirParents.size >= 2;
      return { person, degree: (shared >= 2 || !bothHaveTwo ? 'full' : 'half') as 'full' | 'half' };
    })
    .filter((s): s is Sibling => Boolean(s))
    .sort((a, b) => comparePartialDates(a.person.birthDate, b.person.birthDate));
}

/** Every ancestor, keyed by id, with the number of generations up. */
export function ancestorDepths(index: GraphIndex, personId: string, maxDepth = 32): Map<string, number> {
  const depths = new Map<string, number>();
  let frontier = [personId];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const link of index.parentLinksOf.get(id) ?? []) {
        if (depths.has(link.parentId)) continue;
        depths.set(link.parentId, depth);
        next.push(link.parentId);
      }
    }
    frontier = next;
  }
  return depths;
}

export function descendantIds(index: GraphIndex, personId: string, maxDepth = 32): Set<string> {
  const found = new Set<string>();
  let frontier = [personId];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const link of index.childLinksOf.get(id) ?? []) {
        if (found.has(link.childId)) continue;
        found.add(link.childId);
        next.push(link.childId);
      }
    }
    frontier = next;
  }
  return found;
}

/** People with no recorded parents — the top of each lineage. */
export function rootPersons(index: GraphIndex): Person[] {
  return index.persons
    .filter((p) => (index.parentLinksOf.get(p.id) ?? []).length === 0)
    .sort((a, b) => comparePartialDates(a.birthDate, b.birthDate));
}

/** Connected components, so unrelated branches can be laid out side by side. */
export function connectedComponents(index: GraphIndex): string[][] {
  const seen = new Set<string>();
  const components: string[][] = [];

  const neighbours = (id: string): string[] => {
    const out: string[] = [];
    for (const link of index.parentLinksOf.get(id) ?? []) out.push(link.parentId);
    for (const link of index.childLinksOf.get(id) ?? []) out.push(link.childId);
    for (const union of index.unionsOf.get(id) ?? []) out.push(...union.partnerIds);
    return out;
  };

  for (const person of index.persons) {
    if (seen.has(person.id)) continue;
    const component: string[] = [];
    const stack = [person.id];
    seen.add(person.id);

    while (stack.length > 0) {
      const id = stack.pop()!;
      component.push(id);
      for (const neighbour of neighbours(id)) {
        if (seen.has(neighbour) || !index.personById.has(neighbour)) continue;
        seen.add(neighbour);
        stack.push(neighbour);
      }
    }
    components.push(component);
  }

  return components;
}

// ---------------------------------------------------------------------------
// Naming & display
// ---------------------------------------------------------------------------

export function fullName(person: Pick<Person, 'givenName' | 'familyName'>): string {
  return [person.givenName, person.familyName].filter(Boolean).join(' ').trim();
}

export function displayName(person: Pick<Person, 'givenName' | 'familyName' | 'nickname'>): string {
  const name = fullName(person);
  return name || person.nickname || 'Unnamed';
}

export function initialsOf(person: Pick<Person, 'givenName' | 'familyName'>): string {
  const given = person.givenName?.trim()[0] ?? '';
  const family = person.familyName?.trim()[0] ?? '';
  return (given + family).toUpperCase() || '?';
}

/** Surnames present in the tree, most common first. */
export function surnameTally(persons: Person[]): { surname: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const person of persons) {
    const surname = person.familyName?.trim();
    if (!surname) continue;
    counts.set(surname, (counts.get(surname) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([surname, count]) => ({ surname, count }))
    .sort((a, b) => b.count - a.count || a.surname.localeCompare(b.surname));
}

export interface TreeStats {
  people: number;
  living: number;
  generations: number;
  surnames: number;
  earliestBirth: number | null;
  latestBirth: number | null;
  places: number;
  unions: number;
}

export function treeStats(index: GraphIndex, generationCount: number): TreeStats {
  const births = index.persons.map((p) => yearOf(p.birthDate)).filter((y): y is number => y !== null);
  const places = new Set<string>();
  for (const person of index.persons) {
    for (const place of [person.birthPlace, person.deathPlace, person.residencePlace]) {
      if (place?.trim()) places.add(place.trim().toLowerCase());
    }
  }

  return {
    people: index.persons.length,
    living: index.persons.filter((p) => p.isLiving).length,
    generations: generationCount,
    surnames: surnameTally(index.persons).length,
    earliestBirth: births.length ? Math.min(...births) : null,
    latestBirth: births.length ? Math.max(...births) : null,
    places: places.size,
    unions: index.unions.length,
  };
}
