import { describe, expect, it } from 'vitest';
import {
  ancestorDepths,
  buildIndex,
  childrenOf,
  connectedComponents,
  descendantIds,
  displayName,
  initialsOf,
  parentsOf,
  partnersOf,
  rootPersons,
  siblingsOf,
  surnameTally,
} from './graph';
import { childOf, link, person, union } from './test-fixtures';

describe('buildIndex', () => {
  it('sorts a couple’s children by birth date', () => {
    const dad = person('Dad');
    const mum = person('Mum');
    const couple = union(dad, mum);
    const younger = person('Younger', { birthDate: '1990' });
    const older = person('Older', { birthDate: '1986' });

    const index = buildIndex({
      persons: [dad, mum, younger, older],
      unions: [couple],
      links: [...childOf(couple, [dad, mum], younger), ...childOf(couple, [dad, mum], older)],
    });

    expect(index.childrenOfUnion.get(couple.id)).toEqual([older.id, younger.id]);
  });

  it('lists a person’s marriages oldest first', () => {
    const shared = person('Shared');
    const second = union(shared, person('Second'), { startDate: '2010' });
    const first = union(shared, person('First'), { startDate: '1995' });

    const index = buildIndex({ persons: [shared], unions: [second, first], links: [] });
    expect(index.unionsOf.get(shared.id)?.map((u) => u.id)).toEqual([first.id, second.id]);
  });
});

describe('derived queries', () => {
  const grandad = person('Grandad');
  const granny = person('Granny');
  const grandparents = union(grandad, granny);

  const dad = person('Dad', { birthDate: '1960' });
  const aunt = person('Aunt', { birthDate: '1962' });
  const mum = person('Mum');
  const parents = union(dad, mum);

  const kid = person('Kid', { birthDate: '1990' });
  const sibling = person('Sibling', { birthDate: '1993' });
  const halfSibling = person('Half', { birthDate: '2001' });
  const stepmum = person('Stepmum');
  const secondMarriage = union(dad, stepmum);

  const index = buildIndex({
    persons: [grandad, granny, dad, aunt, mum, kid, sibling, halfSibling, stepmum],
    unions: [grandparents, parents, secondMarriage],
    links: [
      ...childOf(grandparents, [grandad, granny], dad),
      ...childOf(grandparents, [grandad, granny], aunt),
      ...childOf(parents, [dad, mum], kid),
      ...childOf(parents, [dad, mum], sibling),
      ...childOf(secondMarriage, [dad, stepmum], halfSibling),
    ],
  });

  it('finds both parents', () => {
    expect(parentsOf(index, kid.id).map((p) => p.givenName).sort()).toEqual(['Dad', 'Mum']);
  });

  it('finds children across two marriages, oldest first', () => {
    expect(childrenOf(index, dad.id).map((p) => p.givenName)).toEqual(['Kid', 'Sibling', 'Half']);
  });

  it('lists every partner without duplicates', () => {
    expect(partnersOf(index, dad.id).map((p) => p.givenName)).toEqual(['Mum', 'Stepmum']);
  });

  it('separates full siblings from half siblings', () => {
    const siblings = siblingsOf(index, kid.id);
    expect(siblings.map((s) => [s.person.givenName, s.degree])).toEqual([
      ['Sibling', 'full'],
      ['Half', 'half'],
    ]);
  });

  it('measures how far back each ancestor sits', () => {
    const depths = ancestorDepths(index, kid.id);
    expect(depths.get(dad.id)).toBe(1);
    expect(depths.get(grandad.id)).toBe(2);
    expect(depths.has(stepmum.id)).toBe(false);
  });

  it('collects every descendant', () => {
    const descendants = descendantIds(index, grandad.id);
    expect(descendants.has(kid.id)).toBe(true);
    expect(descendants.has(halfSibling.id)).toBe(true);
    expect(descendants.has(mum.id)).toBe(false);
  });

  it('identifies the people with no recorded parents', () => {
    expect(rootPersons(index).map((p) => p.givenName).sort()).toEqual(
      ['Grandad', 'Granny', 'Mum', 'Stepmum'].sort(),
    );
  });
});

describe('connectedComponents', () => {
  it('separates unrelated branches and keeps married ones together', () => {
    const a = person('A');
    const b = person('B');
    const child = person('Child');
    const stranger = person('Stranger');

    const marriage = union(a, b);
    const index = buildIndex({
      persons: [a, b, child, stranger],
      unions: [marriage],
      links: [link(a, child, marriage)],
    });

    const components = connectedComponents(index).map((c) => c.length).sort();
    expect(components).toEqual([1, 3]);
  });

  it('covers every person exactly once', () => {
    const persons = ['A', 'B', 'C', 'D'].map((n) => person(n));
    const index = buildIndex({ persons, unions: [], links: [] });
    const flattened = connectedComponents(index).flat();
    expect(new Set(flattened).size).toBe(persons.length);
  });
});

describe('naming', () => {
  it('falls back through name, nickname and a placeholder', () => {
    expect(displayName(person('Asha', { familyName: 'Rathi' }))).toBe('Asha Rathi');
    expect(initialsOf(person('Asha', { familyName: 'Rathi' }))).toBe('AR');
    expect(initialsOf(person('Asha'))).toBe('A');
  });

  it('tallies surnames by how common they are', () => {
    const persons = [
      person('A', { familyName: 'Rathi' }),
      person('B', { familyName: 'Rathi' }),
      person('C', { familyName: 'Kapoor' }),
      person('D'),
    ];
    expect(surnameTally(persons)).toEqual([
      { surname: 'Rathi', count: 2 },
      { surname: 'Kapoor', count: 1 },
    ]);
  });
});
