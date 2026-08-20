import type { ParentLink, Person, Union } from './types';
import { comparePartialDates } from './dates';
import type { GraphIndex } from './graph';

/**
 * Family-tree layout.
 *
 * Generic graph layouts (dagre, elk) get family trees subtly wrong: they don't
 * know that spouses belong side by side, that a remarriage is a chain rather
 * than a cluster, or that siblings should hang centred beneath the couple that
 * had them. So this is a purpose-built layered layout:
 *
 *   1. generations   — longest-path from the roots, with partners equalised
 *   2. blocks        — same-generation people fused into couple/remarriage chains
 *   3. ordering      — DFS seed, then barycentre sweeps to reduce edge crossings
 *   4. coordinates   — relax toward parents/children, then enforce separation
 *   5. components    — unrelated branches packed left to right
 *
 * Everything here is pure and deterministic: same graph in, same pixels out.
 */

export const CARD_WIDTH = 224;
export const CARD_HEIGHT = 92;
export const SIBLING_GAP = 28;
export const PARTNER_GAP = 48;
export const BLOCK_GAP = 56;
export const COMPONENT_GAP = 180;
export const ROW_HEIGHT = 220;
export const KNOT_SIZE = 12;

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  /** Card centres, keyed by person id. */
  persons: Map<string, Point>;
  /** Knot centres, keyed by union id. */
  unions: Map<string, Point>;
  generations: Map<string, number>;
  generationCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Block {
  id: string;
  generation: number;
  /** Person ids left to right. */
  members: string[];
  /** Union ids sitting between consecutive members. */
  knots: (string | null)[];
  width: number;
  x: number;
  order: number;
}

// ---------------------------------------------------------------------------
// 1. Generations
// ---------------------------------------------------------------------------

/**
 * gen(child) >= gen(parent) + 1, and partners share a generation. Relaxed
 * iteratively because the two rules pull against each other; the iteration cap
 * keeps malformed data (a person who is their own ancestor) from spinning.
 */
export function assignGenerations(
  persons: Person[],
  unions: Union[],
  links: ParentLink[],
): Map<string, number> {
  const generations = new Map<string, number>(persons.map((p) => [p.id, 0]));
  const known = (id: string) => generations.has(id);
  const maxIterations = Math.min(persons.length + 4, 200);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const link of links) {
      if (!known(link.parentId) || !known(link.childId)) continue;
      const wanted = generations.get(link.parentId)! + 1;
      if (wanted > generations.get(link.childId)!) {
        generations.set(link.childId, wanted);
        changed = true;
      }
    }

    for (const union of unions) {
      const partners = union.partnerIds.filter(known);
      if (partners.length < 2) continue;
      const deepest = Math.max(...partners.map((id) => generations.get(id)!));
      for (const id of partners) {
        if (generations.get(id)! < deepest) {
          generations.set(id, deepest);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return generations;
}

// ---------------------------------------------------------------------------
// 2. Blocks — couples and remarriage chains
// ---------------------------------------------------------------------------

/**
 * People married to each other within one generation become a single
 * horizontal block. A remarriage (A–B, B–C) yields the chain [A, B, C] with a
 * knot between each adjacent pair, which is exactly how a genealogist draws it.
 */
function buildBlocks(index: GraphIndex, generations: Map<string, number>, scope: Set<string>): Block[] {
  const adjacency = new Map<string, { partner: string; unionId: string }[]>();
  for (const person of index.persons) {
    if (scope.has(person.id)) adjacency.set(person.id, []);
  }

  for (const union of index.unions) {
    const partners = union.partnerIds.filter(
      (id) => scope.has(id) && generations.get(id) === generations.get(union.partnerIds[0]),
    );
    for (const a of partners) {
      for (const b of partners) {
        if (a === b) continue;
        if (generations.get(a) !== generations.get(b)) continue;
        adjacency.get(a)?.push({ partner: b, unionId: union.id });
      }
    }
  }

  const visited = new Set<string>();
  const blocks: Block[] = [];

  const orderedPersons = [...scope]
    .map((id) => index.personById.get(id)!)
    .filter(Boolean)
    .sort((a, b) => comparePartialDates(a.birthDate, b.birthDate) || a.id.localeCompare(b.id));

  for (const person of orderedPersons) {
    if (visited.has(person.id)) continue;

    // Walk the union component, preferring to start at an endpoint so a chain
    // comes out as a chain rather than starting from the middle.
    const component: string[] = [];
    const stack = [person.id];
    const seen = new Set([person.id]);
    while (stack.length > 0) {
      const id = stack.pop()!;
      component.push(id);
      for (const edge of adjacency.get(id) ?? []) {
        if (seen.has(edge.partner)) continue;
        seen.add(edge.partner);
        stack.push(edge.partner);
      }
    }

    const start =
      component.find((id) => (adjacency.get(id) ?? []).length === 1) ??
      component.slice().sort((a, b) => (adjacency.get(a)!.length - adjacency.get(b)!.length))[0] ??
      component[0];

    const members: string[] = [];
    const knots: (string | null)[] = [];
    const placed = new Set<string>();
    let current: string | undefined = start;

    while (current) {
      members.push(current);
      placed.add(current);
      visited.add(current);

      const next: { partner: string; unionId: string } | undefined = (adjacency.get(current) ?? [])
        .filter((edge) => !placed.has(edge.partner))
        .sort((a, b) => {
          const ua = index.unionById.get(a.unionId);
          const ub = index.unionById.get(b.unionId);
          return comparePartialDates(ua?.startDate, ub?.startDate);
        })[0];

      if (!next) break;
      knots.push(next.unionId);
      current = next.partner;
    }

    // Anyone left in the component (a person with three or more partners) gets
    // appended rather than dropped.
    for (const id of component) {
      if (placed.has(id)) continue;
      const bridging = (adjacency.get(id) ?? []).find((edge) => placed.has(edge.partner));
      knots.push(bridging?.unionId ?? null);
      members.push(id);
      placed.add(id);
      visited.add(id);
    }

    const width =
      members.length * CARD_WIDTH + Math.max(0, members.length - 1) * PARTNER_GAP;

    blocks.push({
      id: `block:${members[0]}`,
      generation: generations.get(members[0]) ?? 0,
      members,
      knots,
      width,
      x: 0,
      order: 0,
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// 3 + 4. Ordering and coordinates
// ---------------------------------------------------------------------------

const median = (values: number[]): number => {
  if (values.length === 0) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

function layoutComponent(
  index: GraphIndex,
  generations: Map<string, number>,
  scope: Set<string>,
): { blocks: Block[]; rows: Map<number, Block[]> } {
  const blocks = buildBlocks(index, generations, scope);
  const blockOfPerson = new Map<string, Block>();
  for (const block of blocks) {
    for (const id of block.members) blockOfPerson.set(id, block);
  }

  const rows = new Map<number, Block[]>();
  for (const block of blocks) {
    const row = rows.get(block.generation);
    if (row) row.push(block);
    else rows.set(block.generation, [block]);
  }

  // Parent → child block adjacency, deduplicated.
  const childBlocks = new Map<string, Set<string>>();
  const parentBlocks = new Map<string, Set<string>>();
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  for (const link of index.links) {
    const parent = blockOfPerson.get(link.parentId);
    const child = blockOfPerson.get(link.childId);
    if (!parent || !child || parent === child) continue;
    if (!childBlocks.has(parent.id)) childBlocks.set(parent.id, new Set());
    if (!parentBlocks.has(child.id)) parentBlocks.set(child.id, new Set());
    childBlocks.get(parent.id)!.add(child.id);
    parentBlocks.get(child.id)!.add(parent.id);
  }

  // --- Initial order: depth-first from the topmost blocks, eldest first.
  const sortedGenerations = [...rows.keys()].sort((a, b) => a - b);
  const orderCounter = { value: 0 };
  const ordered = new Set<string>();

  const visit = (blockId: string) => {
    if (ordered.has(blockId)) return;
    ordered.add(blockId);
    const block = blockById.get(blockId)!;
    block.order = orderCounter.value++;

    const children = [...(childBlocks.get(blockId) ?? [])]
      .map((id) => blockById.get(id)!)
      .filter((b) => b.generation > block.generation)
      .sort((a, b) =>
        comparePartialDates(
          index.personById.get(a.members[0])?.birthDate,
          index.personById.get(b.members[0])?.birthDate,
        ),
      );
    for (const child of children) visit(child.id);
  };

  for (const generation of sortedGenerations) {
    for (const block of rows.get(generation)!) visit(block.id);
  }

  for (const generation of sortedGenerations) {
    rows.get(generation)!.sort((a, b) => a.order - b.order);
  }

  // --- Barycentre sweeps to untangle crossings.
  const sweep = (direction: 'down' | 'up') => {
    const sequence = direction === 'down' ? sortedGenerations : [...sortedGenerations].reverse();
    for (const generation of sequence) {
      const row = rows.get(generation)!;
      const neighbourRowIndex = direction === 'down' ? generation - 1 : generation + 1;
      const neighbourRow = rows.get(neighbourRowIndex);
      if (!neighbourRow) continue;

      const positionOf = new Map(neighbourRow.map((b, i) => [b.id, i]));
      const scored = row.map((block, index_) => {
        const neighbours = direction === 'down' ? parentBlocks.get(block.id) : childBlocks.get(block.id);
        const positions = [...(neighbours ?? [])]
          .map((id) => positionOf.get(id))
          .filter((p): p is number => p !== undefined);
        return { block, key: positions.length ? median(positions) : index_, fallback: index_ };
      });

      scored.sort((a, b) => a.key - b.key || a.fallback - b.fallback);
      rows.set(generation, scored.map((s) => s.block));
    }
  };

  for (let pass = 0; pass < 4; pass += 1) {
    sweep('down');
    sweep('up');
  }

  // --- Coordinates: pack, then relax toward parents/children.
  for (const generation of sortedGenerations) {
    let cursor = 0;
    for (const block of rows.get(generation)!) {
      block.x = cursor + block.width / 2;
      cursor += block.width + BLOCK_GAP;
    }
  }

  const knotX = (block: Block, unionId: string): number | null => {
    const knotIndex = block.knots.indexOf(unionId);
    if (knotIndex === -1) return null;
    const left = block.x - block.width / 2;
    return left + (knotIndex + 1) * CARD_WIDTH + knotIndex * PARTNER_GAP + PARTNER_GAP / 2;
  };

  const personX = (block: Block, personId: string): number => {
    const memberIndex = block.members.indexOf(personId);
    const left = block.x - block.width / 2;
    return left + memberIndex * (CARD_WIDTH + PARTNER_GAP) + CARD_WIDTH / 2;
  };

  /** Where a child block would like to sit: under the union that produced it. */
  const upwardTargets = (block: Block): number[] => {
    const targets: number[] = [];
    for (const personId of block.members) {
      for (const link of index.parentLinksOf.get(personId) ?? []) {
        const parentBlock = blockOfPerson.get(link.parentId);
        if (!parentBlock || parentBlock === block) continue;
        const viaKnot = link.unionId ? knotX(parentBlock, link.unionId) : null;
        targets.push(viaKnot ?? personX(parentBlock, link.parentId));
      }
    }
    return targets;
  };

  const downwardTargets = (block: Block): number[] => {
    const targets: number[] = [];
    for (const personId of block.members) {
      for (const link of index.childLinksOf.get(personId) ?? []) {
        const childBlock = blockOfPerson.get(link.childId);
        if (!childBlock || childBlock === block) continue;
        targets.push(personX(childBlock, link.childId));
      }
    }
    return targets;
  };

  const separate = (row: Block[]) => {
    for (let i = 1; i < row.length; i += 1) {
      const minimum = row[i - 1].x + row[i - 1].width / 2 + BLOCK_GAP + row[i].width / 2;
      if (row[i].x < minimum) row[i].x = minimum;
    }
    for (let i = row.length - 2; i >= 0; i -= 1) {
      const maximum = row[i + 1].x - row[i + 1].width / 2 - BLOCK_GAP - row[i].width / 2;
      if (row[i].x > maximum) row[i].x = maximum;
    }
  };

  for (let pass = 0; pass < 24; pass += 1) {
    const descending = pass % 2 === 0;
    const sequence = descending ? sortedGenerations : [...sortedGenerations].reverse();

    for (const generation of sequence) {
      const row = rows.get(generation)!;
      const wanted = new Map<string, number>();

      for (const block of row) {
        const targets = descending ? upwardTargets(block) : downwardTargets(block);
        if (targets.length === 0) continue;
        const desired = median(targets);
        if (Number.isNaN(desired)) continue;
        wanted.set(block.id, desired);
        block.x += (desired - block.x) * 0.6;
      }

      separate(row);

      // `separate` only ever pushes rightward, so a group of siblings that all
      // want the same spot ends up hanging off the right of their parents.
      // Sliding the whole row back by the average overshoot restores symmetry
      // without disturbing the spacing we just enforced.
      if (wanted.size > 0) {
        let drift = 0;
        for (const block of row) {
          const desired = wanted.get(block.id);
          if (desired !== undefined) drift += block.x - desired;
        }
        drift /= wanted.size;
        if (Math.abs(drift) > 0.01) {
          for (const block of row) block.x -= drift;
        }
      }
    }
  }

  return { blocks, rows };
}

// ---------------------------------------------------------------------------
// 5. Assemble
// ---------------------------------------------------------------------------

export function computeLayout(index: GraphIndex, components: string[][]): LayoutResult {
  const generations = assignGenerations(index.persons, index.unions, index.links);
  const persons = new Map<string, Point>();
  const unions = new Map<string, Point>();

  // Largest branch first, so the family's main line reads left-to-right.
  const ordered = components
    .slice()
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  let offsetX = 0;
  let generationCount = 0;

  for (const component of ordered) {
    const scope = new Set(component);
    const { blocks, rows } = layoutComponent(index, generations, scope);
    if (blocks.length === 0) continue;

    const allX = blocks.flatMap((b) => [b.x - b.width / 2, b.x + b.width / 2]);
    const componentLeft = Math.min(...allX);
    const shift = offsetX - componentLeft;

    for (const block of blocks) {
      const left = block.x + shift - block.width / 2;
      const y = block.generation * ROW_HEIGHT;

      block.members.forEach((personId, memberIndex) => {
        persons.set(personId, {
          x: left + memberIndex * (CARD_WIDTH + PARTNER_GAP) + CARD_WIDTH / 2,
          y: y + CARD_HEIGHT / 2,
        });
      });

      block.knots.forEach((unionId, knotIndex) => {
        if (!unionId) return;
        unions.set(unionId, {
          x: left + (knotIndex + 1) * CARD_WIDTH + knotIndex * PARTNER_GAP + PARTNER_GAP / 2,
          y: y + CARD_HEIGHT / 2,
        });
      });
    }

    generationCount = Math.max(generationCount, rows.size);
    offsetX = Math.max(...allX) + shift + COMPONENT_GAP;
  }

  // Unions whose partners landed in different blocks (rare, e.g. a partner who
  // is also someone's child further down) still need a knot to draw from.
  for (const union of index.unions) {
    if (unions.has(union.id)) continue;
    const points = union.partnerIds.map((id) => persons.get(id)).filter((p): p is Point => Boolean(p));
    if (points.length === 0) continue;
    unions.set(union.id, {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    });
  }

  const xs = [...persons.values()].map((p) => p.x);
  const ys = [...persons.values()].map((p) => p.y);

  return {
    persons,
    unions,
    generations,
    generationCount,
    bounds: {
      minX: xs.length ? Math.min(...xs) - CARD_WIDTH / 2 : 0,
      minY: ys.length ? Math.min(...ys) - CARD_HEIGHT / 2 : 0,
      maxX: xs.length ? Math.max(...xs) + CARD_WIDTH / 2 : 0,
      maxY: ys.length ? Math.max(...ys) + CARD_HEIGHT / 2 : 0,
    },
  };
}

/** Generation labels for the canvas gutter: "Generation 3 · 1940s". */
export function generationBands(
  index: GraphIndex,
  layout: LayoutResult,
): { generation: number; y: number; label: string; era: string }[] {
  const byGeneration = new Map<number, number[]>();
  for (const person of index.persons) {
    const generation = layout.generations.get(person.id);
    if (generation === undefined) continue;
    const year = person.birthDate ? Number(person.birthDate.slice(0, 4)) : NaN;
    if (!Number.isNaN(year)) {
      const list = byGeneration.get(generation);
      if (list) list.push(year);
      else byGeneration.set(generation, [year]);
    } else if (!byGeneration.has(generation)) {
      byGeneration.set(generation, []);
    }
  }

  return [...new Set([...layout.generations.values()])]
    .sort((a, b) => a - b)
    .map((generation) => {
      const years = byGeneration.get(generation) ?? [];
      const decade = years.length ? `${Math.floor(median(years) / 10) * 10}s` : '';
      return {
        generation,
        y: generation * ROW_HEIGHT,
        label: `Generation ${generation + 1}`,
        era: decade,
      };
    });
}
