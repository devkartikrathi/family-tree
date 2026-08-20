import type { Person, Sex } from './types';
import { ancestorDepths, displayName, type GraphIndex } from './graph';

/**
 * Turns two person ids into the phrase a family actually uses: "your
 * great-grandmother", "second cousin once removed", "brother-in-law".
 *
 * The blood case is the classic common-ancestor calculation — find the nearest
 * ancestor the two share and read the relationship off the two depths. Marriage
 * relationships are then layered on top, because a family tree without in-laws
 * is only half a family.
 */

const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const REMOVES = ['', 'once removed', 'twice removed', 'three times removed', 'four times removed'];

export interface Relationship {
  /** "Grandmother", "Second cousin once removed", "Brother-in-law" */
  label: string;
  /** How the two are connected at all. */
  kind: 'self' | 'blood' | 'partner' | 'in-law' | 'step' | 'unrelated';
  /** Generations apart; negative means older. */
  generationGap: number;
  /** Rough closeness, 0 = self. Used for sorting "closest relatives". */
  distance: number;
}

const gendered = (sex: Sex, male: string, female: string, neutral: string): string =>
  sex === 'MALE' ? male : sex === 'FEMALE' ? female : neutral;

function greatPrefix(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return 'great-';
  if (count === 2) return 'great-great-';
  return `${count}× great-`;
}

function ancestorLabel(depth: number, sex: Sex): string {
  if (depth === 1) return gendered(sex, 'Father', 'Mother', 'Parent');
  if (depth === 2) return gendered(sex, 'Grandfather', 'Grandmother', 'Grandparent');
  const base = gendered(sex, 'grandfather', 'grandmother', 'grandparent');
  const label = `${greatPrefix(depth - 2)}${base}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function descendantLabel(depth: number, sex: Sex): string {
  if (depth === 1) return gendered(sex, 'Son', 'Daughter', 'Child');
  if (depth === 2) return gendered(sex, 'Grandson', 'Granddaughter', 'Grandchild');
  const base = gendered(sex, 'grandson', 'granddaughter', 'grandchild');
  const label = `${greatPrefix(depth - 2)}${base}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function auntUncleLabel(steps: number, sex: Sex): string {
  const base = gendered(sex, 'uncle', 'aunt', 'aunt or uncle');
  const label = `${greatPrefix(steps - 2)}${base}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function nieceNephewLabel(steps: number, sex: Sex): string {
  const base = gendered(sex, 'nephew', 'niece', 'nibling');
  const label = `${greatPrefix(steps - 2)}${base}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function cousinLabel(degree: number, removed: number): string {
  const ordinal = ORDINALS[degree] ?? `${degree}th`;
  const removal = removed > 0 ? ` ${REMOVES[removed] ?? `${removed} times removed`}` : '';
  return `${ordinal.charAt(0).toUpperCase()}${ordinal.slice(1)} cousin${removal}`;
}

/** Ancestors of `id`, including `id` itself at depth 0. */
function ancestorsInclusive(index: GraphIndex, id: string): Map<string, number> {
  const map = ancestorDepths(index, id);
  map.set(id, 0);
  return map;
}

type BloodCategory =
  | 'self'
  | 'ancestor'
  | 'descendant'
  | 'sibling'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'cousin';

interface BloodResult {
  fromDepth: number;
  toDepth: number;
  viaId: string;
  category: BloodCategory;
  /** True when the sibling link in the middle of the relationship is a half one. */
  isHalf: boolean;
}

function categorise(fromDepth: number, toDepth: number): BloodCategory {
  if (fromDepth === 0 && toDepth === 0) return 'self';
  if (fromDepth === 0) return 'descendant';
  if (toDepth === 0) return 'ancestor';
  if (fromDepth === 1 && toDepth === 1) return 'sibling';
  if (toDepth === 1) return 'aunt-uncle';
  if (fromDepth === 1) return 'niece-nephew';
  return 'cousin';
}

const parentIdsOf = (index: GraphIndex, personId: string): Set<string> =>
  new Set((index.parentLinksOf.get(personId) ?? []).map((link) => link.parentId));

/**
 * Every collateral relationship (sibling, aunt, cousin) pivots on one pair of
 * siblings somewhere in the middle. Finding that pair is what tells us whether
 * to say "uncle" or "half-uncle".
 */
function junctionAt(
  index: GraphIndex,
  ancestors: Map<string, number>,
  personId: string,
  depth: number,
  viaId: string,
): string | null {
  if (depth === 0) return personId;
  const childrenOfVia = new Set((index.childLinksOf.get(viaId) ?? []).map((link) => link.childId));
  for (const [candidateId, candidateDepth] of ancestors) {
    if (candidateDepth === depth - 1 && childrenOfVia.has(candidateId)) return candidateId;
  }
  return null;
}

function findBlood(index: GraphIndex, fromId: string, toId: string): BloodResult | null {
  const fromAncestors = ancestorsInclusive(index, fromId);
  const toAncestors = ancestorsInclusive(index, toId);

  let best: { fromDepth: number; toDepth: number; viaId: string } | null = null;
  for (const [ancestorId, fromDepth] of fromAncestors) {
    const toDepth = toAncestors.get(ancestorId);
    if (toDepth === undefined) continue;

    const total = fromDepth + toDepth;
    const bestTotal = best ? best.fromDepth + best.toDepth : Infinity;
    if (
      total < bestTotal ||
      (total === bestTotal && Math.abs(fromDepth - toDepth) < Math.abs(best!.fromDepth - best!.toDepth))
    ) {
      best = { fromDepth, toDepth, viaId: ancestorId };
    }
  }

  if (!best) return null;

  const category = categorise(best.fromDepth, best.toDepth);
  let isHalf = false;

  if (category === 'sibling' || category === 'aunt-uncle' || category === 'niece-nephew') {
    const left = junctionAt(index, fromAncestors, fromId, best.fromDepth, best.viaId);
    const right = junctionAt(index, toAncestors, toId, best.toDepth, best.viaId);

    if (left && right) {
      const leftParents = parentIdsOf(index, left);
      const rightParents = parentIdsOf(index, right);
      const shared = [...leftParents].filter((id) => rightParents.has(id)).length;
      // Only claim "half" when both sides have two known parents; with one
      // parent on record we simply don't know.
      isHalf = leftParents.size >= 2 && rightParents.size >= 2 && shared === 1;
    }
  }

  return { ...best, category, isHalf };
}

function bloodLabel(blood: BloodResult, subject: Person): string {
  const { fromDepth, toDepth, category, isHalf } = blood;
  const half = (label: string) =>
    isHalf ? `Half-${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;

  switch (category) {
    case 'self':
      return 'Themselves';
    case 'descendant':
      return descendantLabel(toDepth, subject.sex);
    case 'ancestor':
      return ancestorLabel(fromDepth, subject.sex);
    case 'sibling': {
      const base = gendered(subject.sex, 'Brother', 'Sister', 'Sibling');
      return half(base);
    }
    case 'aunt-uncle':
      return half(auntUncleLabel(fromDepth, subject.sex));
    case 'niece-nephew':
      return half(nieceNephewLabel(toDepth, subject.sex));
    case 'cousin':
      return cousinLabel(Math.min(fromDepth, toDepth) - 1, Math.abs(fromDepth - toDepth));
  }
}

function partnerLabel(subject: Person, status?: string): string {
  if (status === 'DIVORCED') return gendered(subject.sex, 'Ex-husband', 'Ex-wife', 'Former partner');
  if (status === 'WIDOWED') return gendered(subject.sex, 'Late husband', 'Late wife', 'Late partner');
  return gendered(subject.sex, 'Husband', 'Wife', 'Partner');
}

/**
 * In-law terms take their gender from the *subject*, not from the relative
 * they married: your sister's husband is your brother-in-law.
 */
function spouseOfRelativeLabel(relation: BloodResult, subject: Person): string {
  switch (relation.category) {
    case 'self':
      return partnerLabel(subject);
    case 'sibling':
      return gendered(subject.sex, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law');
    case 'descendant':
      return `${descendantLabel(relation.toDepth, subject.sex)}-in-law`;
    case 'ancestor':
      return relation.fromDepth === 1
        ? gendered(subject.sex, 'Stepfather', 'Stepmother', 'Step-parent')
        : `Step-${ancestorLabel(relation.fromDepth, subject.sex).toLowerCase()}`;
    case 'aunt-uncle':
      return gendered(subject.sex, 'Uncle by marriage', 'Aunt by marriage', 'Aunt or uncle by marriage');
    case 'niece-nephew':
      return gendered(subject.sex, 'Nephew by marriage', 'Niece by marriage', 'Nibling by marriage');
    case 'cousin':
      return `${cousinLabel(Math.min(relation.fromDepth, relation.toDepth) - 1, Math.abs(relation.fromDepth - relation.toDepth))} by marriage`;
  }
}

/** The mirror case: a blood relative of the person you married. */
function relativeOfSpouseLabel(relation: BloodResult, subject: Person): string {
  switch (relation.category) {
    case 'self':
      return partnerLabel(subject);
    case 'ancestor':
      return relation.fromDepth === 1
        ? gendered(subject.sex, 'Father-in-law', 'Mother-in-law', 'Parent-in-law')
        : `${ancestorLabel(relation.fromDepth, subject.sex)}-in-law`;
    case 'sibling':
      return gendered(subject.sex, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law');
    case 'descendant':
      return relation.toDepth === 1
        ? gendered(subject.sex, 'Stepson', 'Stepdaughter', 'Stepchild')
        : `Step-${descendantLabel(relation.toDepth, subject.sex).toLowerCase()}`;
    case 'aunt-uncle':
      return gendered(subject.sex, 'Uncle by marriage', 'Aunt by marriage', 'Aunt or uncle by marriage');
    case 'niece-nephew':
      return gendered(subject.sex, 'Nephew by marriage', 'Niece by marriage', 'Nibling by marriage');
    case 'cousin':
      return `${cousinLabel(Math.min(relation.fromDepth, relation.toDepth) - 1, Math.abs(relation.fromDepth - relation.toDepth))} by marriage`;
  }
}

/**
 * How `toId` is related to `fromId`, phrased from `fromId`'s point of view.
 */
export function describeRelationship(
  index: GraphIndex,
  fromId: string,
  toId: string,
): Relationship {
  const subject = index.personById.get(toId);
  if (!subject) return { label: 'Unknown', kind: 'unrelated', generationGap: 0, distance: Infinity };
  if (fromId === toId) return { label: 'This is you', kind: 'self', generationGap: 0, distance: 0 };

  const blood = findBlood(index, fromId, toId);
  if (blood) {
    return {
      label: bloodLabel(blood, subject),
      kind: 'blood',
      generationGap: blood.toDepth - blood.fromDepth,
      distance: blood.fromDepth + blood.toDepth,
    };
  }

  // Direct partner.
  for (const union of index.unionsOf.get(fromId) ?? []) {
    if (union.partnerIds.includes(toId)) {
      return { label: partnerLabel(subject, union.status), kind: 'partner', generationGap: 0, distance: 1 };
    }
  }

  // `to` married a blood relative of `from` — brother-in-law, stepmother, …
  let best: { relation: BloodResult; label: string } | null = null;

  for (const union of index.unionsOf.get(toId) ?? []) {
    for (const partnerId of union.partnerIds) {
      if (partnerId === toId) continue;
      const relation = findBlood(index, fromId, partnerId);
      if (!relation) continue;
      const distance = relation.fromDepth + relation.toDepth;
      if (!best || distance < best.relation.fromDepth + best.relation.toDepth) {
        best = { relation, label: spouseOfRelativeLabel(relation, subject) };
      }
    }
  }

  // `to` is a blood relative of the person `from` married.
  for (const union of index.unionsOf.get(fromId) ?? []) {
    for (const partnerId of union.partnerIds) {
      if (partnerId === fromId) continue;
      const relation = findBlood(index, partnerId, toId);
      if (!relation) continue;
      const distance = relation.fromDepth + relation.toDepth;
      if (!best || distance < best.relation.fromDepth + best.relation.toDepth) {
        best = { relation, label: relativeOfSpouseLabel(relation, subject) };
      }
    }
  }

  if (best) {
    return {
      label: best.label,
      kind: 'in-law',
      generationGap: best.relation.toDepth - best.relation.fromDepth,
      distance: best.relation.fromDepth + best.relation.toDepth + 1,
    };
  }

  // Step-relations: a partner of a parent, or the child of a partner.
  for (const link of index.parentLinksOf.get(fromId) ?? []) {
    for (const union of index.unionsOf.get(link.parentId) ?? []) {
      if (union.partnerIds.includes(toId)) {
        return {
          label: gendered(subject.sex, 'Stepfather', 'Stepmother', 'Step-parent'),
          kind: 'step',
          generationGap: -1,
          distance: 2,
        };
      }
    }
  }

  return { label: 'Related through the family', kind: 'unrelated', generationGap: 0, distance: Infinity };
}

// ---------------------------------------------------------------------------
// Connection path — "how am I connected to this person?"
// ---------------------------------------------------------------------------

export interface PathStep {
  personId: string;
  name: string;
  /** How we arrived at this person from the previous one. */
  via: 'parent' | 'child' | 'partner' | 'start';
}

/**
 * Shortest walk between two people over parent / child / partner edges.
 * Rendered as a breadcrumb so a distant relative becomes legible:
 * "you → your mother Sunita → her brother Anil → his daughter Meera".
 */
export function connectionPath(index: GraphIndex, fromId: string, toId: string): PathStep[] | null {
  if (fromId === toId) return [];

  const previous = new Map<string, { id: string; via: PathStep['via'] }>();
  const seen = new Set([fromId]);
  let frontier = [fromId];

  while (frontier.length > 0) {
    const next: string[] = [];

    for (const id of frontier) {
      const neighbours: { id: string; via: PathStep['via'] }[] = [];
      for (const link of index.parentLinksOf.get(id) ?? []) {
        neighbours.push({ id: link.parentId, via: 'parent' });
      }
      for (const link of index.childLinksOf.get(id) ?? []) {
        neighbours.push({ id: link.childId, via: 'child' });
      }
      for (const union of index.unionsOf.get(id) ?? []) {
        for (const partnerId of union.partnerIds) {
          if (partnerId !== id) neighbours.push({ id: partnerId, via: 'partner' });
        }
      }

      for (const neighbour of neighbours) {
        if (seen.has(neighbour.id) || !index.personById.has(neighbour.id)) continue;
        seen.add(neighbour.id);
        previous.set(neighbour.id, { id, via: neighbour.via });

        if (neighbour.id === toId) {
          const path: PathStep[] = [];
          let cursor: string = toId;
          while (cursor !== fromId) {
            const step: { id: string; via: PathStep['via'] } | undefined = previous.get(cursor);
            if (!step) break;
            path.unshift({
              personId: cursor,
              name: displayName(index.personById.get(cursor)!),
              via: step.via,
            });
            cursor = step.id;
          }
          path.unshift({
            personId: fromId,
            name: displayName(index.personById.get(fromId)!),
            via: 'start',
          });
          return path;
        }

        next.push(neighbour.id);
      }
    }

    frontier = next;
  }

  return null;
}

/** Closest relatives to a person, nearest first — powers the profile sidebar. */
export function closestRelatives(
  index: GraphIndex,
  personId: string,
  limit = 12,
): { person: Person; relationship: Relationship }[] {
  return index.persons
    .filter((p) => p.id !== personId)
    .map((person) => ({ person, relationship: describeRelationship(index, personId, person.id) }))
    .filter((entry) => entry.relationship.distance !== Infinity)
    .sort((a, b) => a.relationship.distance - b.relationship.distance)
    .slice(0, limit);
}
