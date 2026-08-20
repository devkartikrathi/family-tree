import { route } from '@/lib/server/api';
import { requireTreeAccess } from '@/lib/server/auth';
import { loadTreeGraph } from '@/lib/server/trees';
import { toGedcom } from '@/lib/domain/gedcom';
import { buildIndex, childrenOf, fullName, parentsOf, partnersOf } from '@/lib/domain/graph';

type Context = { params: Promise<{ treeId: string }> };

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'family-tree';

const csvCell = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Your family, in your hands, in three formats — GEDCOM for other genealogy
 * software, JSON for a faithful backup, CSV for a spreadsheet. No export means
 * no exit, and no exit means you were never really the owner.
 */
export const GET = route<Context>(async (request, { params }) => {
  const { treeId } = await params;
  const { role } = await requireTreeAccess(treeId);

  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  const graph = await loadTreeGraph(treeId, role);
  const filename = `${slug(graph.tree.name)}-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'gedcom') {
    return new Response(toGedcom(graph), {
      headers: {
        'Content-Type': 'text/vnd.familysearch.gedcom; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.ged"`,
      },
    });
  }

  if (format === 'csv') {
    const index = buildIndex(graph);
    const header = [
      'id', 'given_name', 'family_name', 'sex', 'birth_date', 'birth_place',
      'living', 'death_date', 'death_place', 'residence', 'occupation',
      'parents', 'partners', 'children',
    ];

    const rows = graph.persons.map((person) =>
      [
        person.id,
        person.givenName,
        person.familyName,
        person.sex,
        person.birthDate,
        person.birthPlace,
        person.isLiving ? 'yes' : 'no',
        person.deathDate,
        person.deathPlace,
        person.residencePlace,
        person.occupation,
        parentsOf(index, person.id).map(fullName).join('; '),
        partnersOf(index, person.id).map(fullName).join('; '),
        childrenOf(index, person.id).map(fullName).join('; '),
      ].map(csvCell).join(','),
    );

    return new Response(`${[header.join(','), ...rows].join('\n')}\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const payload = {
    format: 'legacy-export/v1',
    exportedAt: new Date().toISOString(),
    tree: graph.tree,
    persons: graph.persons,
    unions: graph.unions,
    links: graph.links,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  });
});
