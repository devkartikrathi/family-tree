import { describe, expect, it } from 'vitest';
import { buildIndex } from './graph';
import { closestRelatives, connectionPath, describeRelationship } from './kinship';
import { childOf, person, union } from './test-fixtures';
import type { ParentLink, Person, Union } from './types';

/**
 * A four-generation family with a remarriage, so the fixture exercises the
 * cases that actually break naive kinship code: half-siblings, cousins,
 * removals, and in-laws.
 *
 *   Ramesh ═ Sunita          Vikram ═ Asha
 *      ├── Anil ═ Priya          └── Priya
 *      │      └── Meera
 *      └── Deepa ═ Suresh
 *             └── Rohan
 *
 * Plus: Ramesh's second marriage to Kamala produced Nikhil (Anil's half-brother).
 */
function family() {
  const ramesh = person('Ramesh', { sex: 'MALE', birthDate: '1935' });
  const sunita = person('Sunita', { sex: 'FEMALE', birthDate: '1938' });
  const kamala = person('Kamala', { sex: 'FEMALE', birthDate: '1945' });

  const anil = person('Anil', { sex: 'MALE', birthDate: '1960' });
  const deepa = person('Deepa', { sex: 'FEMALE', birthDate: '1963' });
  const nikhil = person('Nikhil', { sex: 'MALE', birthDate: '1975' });

  const priya = person('Priya', { sex: 'FEMALE', birthDate: '1962' });
  const suresh = person('Suresh', { sex: 'MALE', birthDate: '1961' });

  const meera = person('Meera', { sex: 'FEMALE', birthDate: '1990' });
  const rohan = person('Rohan', { sex: 'MALE', birthDate: '1992' });

  const vikram = person('Vikram', { sex: 'MALE', birthDate: '1936' });
  const asha = person('Asha', { sex: 'FEMALE', birthDate: '1940' });

  const first = union(ramesh, sunita);
  const second = union(ramesh, kamala, { status: 'CURRENT' });
  const anilPriya = union(anil, priya);
  const deepaSuresh = union(deepa, suresh);
  const priyaParents = union(vikram, asha);

  const persons: Person[] = [
    ramesh, sunita, kamala, anil, deepa, nikhil, priya, suresh, meera, rohan, vikram, asha,
  ];
  const unions: Union[] = [first, second, anilPriya, deepaSuresh, priyaParents];
  const links: ParentLink[] = [
    ...childOf(first, [ramesh, sunita], anil),
    ...childOf(first, [ramesh, sunita], deepa),
    ...childOf(second, [ramesh, kamala], nikhil),
    ...childOf(anilPriya, [anil, priya], meera),
    ...childOf(deepaSuresh, [deepa, suresh], rohan),
    ...childOf(priyaParents, [vikram, asha], priya),
  ];

  return {
    index: buildIndex({ persons, unions, links }),
    ids: {
      ramesh: ramesh.id, sunita: sunita.id, kamala: kamala.id,
      anil: anil.id, deepa: deepa.id, nikhil: nikhil.id,
      priya: priya.id, suresh: suresh.id,
      meera: meera.id, rohan: rohan.id,
      vikram: vikram.id, asha: asha.id,
    },
  };
}

describe('describeRelationship — direct line', () => {
  const { index, ids } = family();
  const label = (from: string, to: string) => describeRelationship(index, from, to).label;

  it('names parents and children with gender when known', () => {
    expect(label(ids.anil, ids.ramesh)).toBe('Father');
    expect(label(ids.anil, ids.sunita)).toBe('Mother');
    expect(label(ids.ramesh, ids.anil)).toBe('Son');
    expect(label(ids.ramesh, ids.deepa)).toBe('Daughter');
  });

  it('climbs and descends the generations', () => {
    expect(label(ids.meera, ids.ramesh)).toBe('Grandfather');
    expect(label(ids.ramesh, ids.meera)).toBe('Granddaughter');
  });

  it('recognises itself', () => {
    expect(label(ids.anil, ids.anil)).toBe('This is you');
  });
});

describe('describeRelationship — siblings', () => {
  const { index, ids } = family();
  const label = (from: string, to: string) => describeRelationship(index, from, to).label;

  it('distinguishes full from half siblings', () => {
    expect(label(ids.anil, ids.deepa)).toBe('Sister');
    // Nikhil shares only Ramesh.
    expect(label(ids.anil, ids.nikhil)).toBe('Half-brother');
    expect(label(ids.nikhil, ids.anil)).toBe('Half-brother');
  });
});

describe('describeRelationship — the sideways cases', () => {
  const { index, ids } = family();
  const label = (from: string, to: string) => describeRelationship(index, from, to).label;

  it('handles aunts, uncles, nieces and nephews', () => {
    expect(label(ids.meera, ids.deepa)).toBe('Aunt');
    expect(label(ids.deepa, ids.meera)).toBe('Niece');
    expect(label(ids.rohan, ids.anil)).toBe('Uncle');
  });

  it('counts cousins and removals', () => {
    expect(label(ids.meera, ids.rohan)).toBe('First cousin');
    // Meera's grandfather is Nikhil's father: one generation apart.
    expect(label(ids.meera, ids.nikhil)).toBe('Half-uncle');
    expect(label(ids.nikhil, ids.meera)).toBe('Half-niece');
  });
});

describe('describeRelationship — marriage', () => {
  const { index, ids } = family();
  const relation = (from: string, to: string) => describeRelationship(index, from, to);

  it('names spouses', () => {
    expect(relation(ids.anil, ids.priya).label).toBe('Wife');
    expect(relation(ids.priya, ids.anil).label).toBe('Husband');
  });

  it('names in-laws through the spouse', () => {
    expect(relation(ids.anil, ids.vikram).label).toBe('Father-in-law');
    expect(relation(ids.anil, ids.asha).label).toBe('Mother-in-law');
    expect(relation(ids.anil, ids.vikram).kind).toBe('in-law');
  });

  it('names in-laws through a blood relative', () => {
    // Suresh married Anil's sister.
    expect(relation(ids.anil, ids.suresh).label).toBe('Brother-in-law');
  });

  it('does not invent a blood relationship between two unrelated in-laws', () => {
    const result = relation(ids.vikram, ids.suresh);
    expect(result.kind).not.toBe('blood');
  });
});

describe('connectionPath', () => {
  const { index, ids } = family();

  it('walks the shortest route between two people', () => {
    // Anil and Deepa are siblings, which is not an edge — the walk goes up
    // through the parent they share, which is also how a genealogist reads it.
    const path = connectionPath(index, ids.meera, ids.rohan);
    expect(path?.map((step) => step.name)).toEqual(['Meera', 'Anil', 'Ramesh', 'Deepa', 'Rohan']);
    expect(path?.map((step) => step.via)).toEqual(['start', 'parent', 'parent', 'child', 'child']);
  });

  it('returns an empty path for the same person', () => {
    expect(connectionPath(index, ids.anil, ids.anil)).toEqual([]);
  });

  it('returns null when there is genuinely no connection', () => {
    const stranger = person('Stranger');
    const isolated = buildIndex({
      persons: [...index.persons, stranger],
      unions: index.unions,
      links: index.links,
    });
    expect(connectionPath(isolated, ids.anil, stranger.id)).toBeNull();
  });
});

describe('closestRelatives', () => {
  const { index, ids } = family();

  it('puts the immediate family first', () => {
    const closest = closestRelatives(index, ids.meera, 4).map((entry) => entry.person.givenName);
    expect(closest.slice(0, 3).sort()).toEqual(['Anil', 'Priya', 'Ramesh'].slice(0, 3).sort());
  });

  it('never includes the person themselves', () => {
    expect(closestRelatives(index, ids.meera).some((e) => e.person.id === ids.meera)).toBe(false);
  });
});
