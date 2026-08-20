import { describe, expect, it } from 'vitest';
import { buildIndex, connectedComponents } from './graph';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  PARTNER_GAP,
  ROW_HEIGHT,
  assignGenerations,
  computeLayout,
} from './layout';
import { childOf, link, person, union } from './test-fixtures';
import type { ParentLink, Person, Union } from './types';

const layoutOf = (persons: Person[], unions: Union[], links: ParentLink[]) => {
  const index = buildIndex({ persons, unions, links });
  return { index, result: computeLayout(index, connectedComponents(index)) };
};

describe('assignGenerations', () => {
  it('places each child one row below their parents', () => {
    const a = person('A');
    const b = person('B');
    const c = person('C');
    const generations = assignGenerations([a, b, c], [], [link(a, b), link(b, c)]);

    expect(generations.get(a.id)).toBe(0);
    expect(generations.get(b.id)).toBe(1);
    expect(generations.get(c.id)).toBe(2);
  });

  it('pulls a partner down to meet their spouse', () => {
    // Nikhil married into the family two generations below his own root.
    const elder = person('Elder');
    const child = person('Child');
    const spouse = person('Spouse');
    const marriage = union(child, spouse);

    const generations = assignGenerations(
      [elder, child, spouse],
      [marriage],
      [link(elder, child)],
    );

    expect(generations.get(child.id)).toBe(generations.get(spouse.id));
  });

  it('terminates on corrupt data instead of looping forever', () => {
    const a = person('A');
    const b = person('B');
    // A is B's parent and B is A's parent — impossible, but survivable.
    const generations = assignGenerations([a, b], [], [link(a, b), link(b, a)]);
    expect(generations.size).toBe(2);
  });
});

describe('computeLayout', () => {
  it('returns nothing for an empty tree', () => {
    const { result } = layoutOf([], [], []);
    expect(result.persons.size).toBe(0);
    expect(result.generationCount).toBe(0);
  });

  it('seats partners side by side at the same height', () => {
    const a = person('A');
    const b = person('B');
    const { result } = layoutOf([a, b], [union(a, b)], []);

    const left = result.persons.get(a.id)!;
    const right = result.persons.get(b.id)!;

    expect(left.y).toBe(right.y);
    expect(Math.abs(right.x - left.x)).toBeCloseTo(CARD_WIDTH + PARTNER_GAP, 5);
  });

  it('puts the knot for a couple exactly between them', () => {
    const a = person('A');
    const b = person('B');
    const marriage = union(a, b);
    const { result } = layoutOf([a, b], [marriage], []);

    const knot = result.unions.get(marriage.id)!;
    const midpoint = (result.persons.get(a.id)!.x + result.persons.get(b.id)!.x) / 2;
    expect(knot.x).toBeCloseTo(midpoint, 5);
  });

  it('places every child below every one of their parents', () => {
    const dad = person('Dad');
    const mum = person('Mum');
    const couple = union(dad, mum);
    const kids = [person('One', { birthDate: '1980' }), person('Two', { birthDate: '1983' })];
    const links = kids.flatMap((kid) => childOf(couple, [dad, mum], kid));

    const { result } = layoutOf([dad, mum, ...kids], [couple], links);

    const parentY = result.persons.get(dad.id)!.y;
    for (const kid of kids) {
      expect(result.persons.get(kid.id)!.y).toBe(parentY + ROW_HEIGHT);
    }
  });

  it('centres a sibling group under the couple that had them', () => {
    const dad = person('Dad');
    const mum = person('Mum');
    const couple = union(dad, mum);
    const kids = [
      person('One', { birthDate: '1980' }),
      person('Two', { birthDate: '1983' }),
      person('Three', { birthDate: '1986' }),
    ];
    const links = kids.flatMap((kid) => childOf(couple, [dad, mum], kid));

    const { result } = layoutOf([dad, mum, ...kids], [couple], links);

    const knot = result.unions.get(couple.id)!.x;
    const childXs = kids.map((kid) => result.persons.get(kid.id)!.x);
    const childCentre = (Math.min(...childXs) + Math.max(...childXs)) / 2;

    expect(childCentre).toBeCloseTo(knot, 0);
  });

  it('orders siblings oldest to youngest, left to right', () => {
    const dad = person('Dad');
    const couple = union(dad, person('Mum'));
    const eldest = person('Eldest', { birthDate: '1975' });
    const middle = person('Middle', { birthDate: '1979' });
    const youngest = person('Youngest', { birthDate: '1984' });
    const persons = [dad, eldest, middle, youngest];
    const links = [eldest, middle, youngest].map((kid) => link(dad, kid, couple));

    const { result } = layoutOf(persons, [], links);
    const x = (p: Person) => result.persons.get(p.id)!.x;

    expect(x(eldest)).toBeLessThan(x(middle));
    expect(x(middle)).toBeLessThan(x(youngest));
  });

  it('never overlaps two cards in the same row', () => {
    // Three generations, two branches, a remarriage — enough to crowd a row.
    const root = person('Root');
    const rootSpouse = person('Root Spouse');
    const rootUnion = union(root, rootSpouse);

    const kids = ['A', 'B', 'C'].map((n, i) => person(n, { birthDate: `${1960 + i * 3}` }));
    const kidLinks = kids.flatMap((kid) => childOf(rootUnion, [root, rootSpouse], kid));

    const spouses = kids.map((kid) => person(`${kid.givenName} spouse`));
    const marriages = kids.map((kid, i) => union(kid, spouses[i]));

    const grandkids = kids.flatMap((kid, i) => [
      person(`${kid.givenName}1`, { birthDate: '1990' }),
      person(`${kid.givenName}2`, { birthDate: '1993' }),
    ]);
    const grandkidLinks = grandkids.flatMap((grandkid, i) => {
      const parentIndex = Math.floor(i / 2);
      return childOf(marriages[parentIndex], [kids[parentIndex], spouses[parentIndex]], grandkid);
    });

    const persons = [root, rootSpouse, ...kids, ...spouses, ...grandkids];
    const { result } = layoutOf(persons, [rootUnion, ...marriages], [...kidLinks, ...grandkidLinks]);

    const rows = new Map<number, { id: string; x: number }[]>();
    for (const [id, point] of result.persons) {
      const row = rows.get(point.y) ?? [];
      row.push({ id, x: point.x });
      rows.set(point.y, row);
    }

    for (const row of rows.values()) {
      const sorted = row.sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i].x - sorted[i - 1].x).toBeGreaterThanOrEqual(CARD_WIDTH - 0.001);
      }
    }
  });

  it('keeps unrelated branches apart', () => {
    const one = person('One');
    const two = person('Two');
    const { result } = layoutOf([one, two], [], []);

    const gap = Math.abs(result.persons.get(one.id)!.x - result.persons.get(two.id)!.x);
    expect(gap).toBeGreaterThan(CARD_WIDTH);
  });

  it('is deterministic', () => {
    const dad = person('Dad');
    const mum = person('Mum');
    const couple = union(dad, mum);
    const kid = person('Kid');
    const links = childOf(couple, [dad, mum], kid);

    const first = layoutOf([dad, mum, kid], [couple], links).result;
    const second = layoutOf([dad, mum, kid], [couple], links).result;

    for (const [id, point] of first.persons) {
      expect(second.persons.get(id)).toEqual(point);
    }
  });

  it('lays out a remarriage as a chain, not a pile', () => {
    const shared = person('Shared');
    const first = person('First');
    const second = person('Second');
    const marriages = [union(shared, first), union(shared, second)];

    const { result } = layoutOf([shared, first, second], marriages, []);
    const xs = [first, shared, second].map((p) => result.persons.get(p.id)!.x);

    // All three sit in one row, evenly spaced, with the shared partner between.
    expect(new Set([first, shared, second].map((p) => result.persons.get(p.id)!.y)).size).toBe(1);
    const sorted = [...xs].sort((a, b) => a - b);
    expect(sorted[1]).toBe(result.persons.get(shared.id)!.x);
  });

  it('reports bounds that contain every card', () => {
    const a = person('A');
    const b = person('B');
    const kid = person('Kid');
    const couple = union(a, b);
    const { result } = layoutOf([a, b, kid], [couple], childOf(couple, [a, b], kid));

    for (const point of result.persons.values()) {
      expect(point.x - CARD_WIDTH / 2).toBeGreaterThanOrEqual(result.bounds.minX - 0.001);
      expect(point.x + CARD_WIDTH / 2).toBeLessThanOrEqual(result.bounds.maxX + 0.001);
      expect(point.y - CARD_HEIGHT / 2).toBeGreaterThanOrEqual(result.bounds.minY - 0.001);
      expect(point.y + CARD_HEIGHT / 2).toBeLessThanOrEqual(result.bounds.maxY + 0.001);
    }
  });
});
