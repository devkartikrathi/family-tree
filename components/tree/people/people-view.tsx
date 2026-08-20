'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/empty-state';
import { PersonAvatar } from '@/components/person-avatar';
import { useTree } from '@/lib/hooks/use-tree';
import { childrenOf, displayName, parentsOf, surnameTally } from '@/lib/domain/graph';
import { ageBetween, comparePartialDates, lifespanLabel, yearOf } from '@/lib/domain/dates';
import { describeRelationship } from '@/lib/domain/kinship';
import { cn } from '@/lib/utils';
import type { Person } from '@/lib/domain/types';

type SortKey = 'name' | 'birth' | 'generation';
type Filter = 'all' | 'living' | 'remembered' | 'unlinked';

/**
 * The tree is for seeing shape; this is for finding gaps. Sorting by birth
 * shows the century at a glance, and "loose ends" surfaces the people nobody
 * has connected to anyone yet — the single most useful thing to fix next.
 */
export function PeopleView({
  selectedId,
  onSelect,
  onAddPerson,
}: {
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onAddPerson: () => void;
}) {
  const { persons, index, layout, mePersonId, canEdit } = useTree();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [surname, setSurname] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });

  const surnames = useMemo(() => surnameTally(persons).slice(0, 8), [persons]);

  const rows = useMemo(() => {
    const cleaned = query.trim().toLowerCase();

    const filtered = persons.filter((person) => {
      if (surname && person.familyName !== surname) return false;

      if (filter === 'living' && !person.isLiving) return false;
      if (filter === 'remembered' && person.isLiving) return false;
      if (filter === 'unlinked') {
        const connected =
          (index.parentLinksOf.get(person.id)?.length ?? 0) +
          (index.childLinksOf.get(person.id)?.length ?? 0) +
          (index.unionsOf.get(person.id)?.length ?? 0);
        if (connected > 0) return false;
      }

      if (!cleaned) return true;
      return [
        displayName(person),
        person.nickname,
        person.maidenName,
        person.birthPlace,
        person.residencePlace,
        person.occupation,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(cleaned));
    });

    const direction = sort.direction === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sort.key === 'name') return direction * displayName(a).localeCompare(displayName(b));
      if (sort.key === 'birth') return direction * comparePartialDates(a.birthDate, b.birthDate);
      return (
        direction *
        ((layout.generations.get(a.id) ?? 0) - (layout.generations.get(b.id) ?? 0) ||
          comparePartialDates(a.birthDate, b.birthDate))
      );
    });
  }, [persons, query, filter, surname, sort, index, layout]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'name' ? 'asc' : 'asc' },
    );

  if (persons.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nobody here yet"
          description="Once you start adding people, this is where you can scan the whole family at once."
          action={
            canEdit ? (
              <Button onClick={onAddPerson} className="gap-2">
                <UserPlus className="size-4" />
                Add the first person
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name, town, occupation…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'Everyone'],
                ['living', 'Living'],
                ['remembered', 'Remembered'],
                ['unlinked', 'Loose ends'],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === value
                    ? 'border-ochre/40 bg-ochre-soft text-ochre'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {surnames.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Surnames</span>
            {surnames.map((entry) => (
              <button
                key={entry.surname}
                type="button"
                onClick={() => setSurname(surname === entry.surname ? null : entry.surname)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  surname === entry.surname
                    ? 'border-sage/40 bg-sage-soft text-sage'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {entry.surname}
                <span className="ml-1.5 opacity-60">{entry.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <tr className="border-b border-border text-left">
              <SortHeader
                label="Name"
                active={sort.key === 'name'}
                direction={sort.direction}
                onClick={() => toggleSort('name')}
                className="pl-5"
              />
              <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">
                {mePersonId ? 'Relationship' : 'Also known as'}
              </th>
              <SortHeader
                label="Life"
                active={sort.key === 'birth'}
                direction={sort.direction}
                onClick={() => toggleSort('birth')}
              />
              <th className="hidden px-3 py-2.5 text-xs font-medium text-muted-foreground lg:table-cell">
                Places
              </th>
              <SortHeader
                label="Generation"
                active={sort.key === 'generation'}
                direction={sort.direction}
                onClick={() => toggleSort('generation')}
                className="hidden md:table-cell"
              />
              <th className="hidden px-3 py-2.5 pr-5 text-xs font-medium text-muted-foreground xl:table-cell">
                Family
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                selected={person.id === selectedId}
                isMe={person.id === mePersonId}
                relationship={
                  mePersonId && person.id !== mePersonId
                    ? describeRelationship(index, mePersonId, person.id).label
                    : null
                }
                generation={(layout.generations.get(person.id) ?? 0) + 1}
                parents={parentsOf(index, person.id).length}
                children={childrenOf(index, person.id).length}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nobody matches those filters.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
        Showing {rows.length} of {persons.length}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={cn('px-3 py-2.5', className)} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
        {active &&
          (direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}

function PersonRow({
  person,
  selected,
  isMe,
  relationship,
  generation,
  parents,
  children,
  onSelect,
}: {
  person: Person;
  selected: boolean;
  isMe: boolean;
  relationship: string | null;
  generation: number;
  parents: number;
  children: number;
  onSelect: (personId: string) => void;
}) {
  const age = person.isLiving
    ? ageBetween(person.birthDate)
    : ageBetween(person.birthDate, person.deathDate);

  return (
    <tr
      onClick={() => onSelect(person.id)}
      className={cn(
        'cursor-pointer border-b border-border/60 transition-colors',
        selected ? 'bg-ochre-soft/50' : 'hover:bg-muted/50',
      )}
    >
      <td className="py-2.5 pr-3 pl-5">
        <div className="flex items-center gap-2.5">
          <PersonAvatar person={person} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName(person)}</p>
            {person.occupation && (
              <p className="truncate text-xs text-muted-foreground">{person.occupation}</p>
            )}
          </div>
          {isMe && (
            <Badge variant="ochre" className="ml-1 shrink-0">
              You
            </Badge>
          )}
        </div>
      </td>

      <td className="px-3 py-2.5 text-muted-foreground">
        {relationship ?? person.nickname ?? <span className="opacity-40">—</span>}
      </td>

      <td className="px-3 py-2.5">
        <span className={cn(!person.isLiving && 'text-muted-foreground')}>
          {lifespanLabel(person) || <span className="opacity-40">—</span>}
        </span>
        {age !== null && <span className="ml-1.5 text-xs text-muted-foreground">({age})</span>}
      </td>

      <td className="hidden max-w-56 truncate px-3 py-2.5 text-muted-foreground lg:table-cell">
        {person.residencePlace ?? person.birthPlace ?? <span className="opacity-40">—</span>}
      </td>

      <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">
        {yearOf(person.birthDate) ? `${generation}` : generation}
      </td>

      <td className="hidden px-3 py-2.5 pr-5 text-xs text-muted-foreground xl:table-cell">
        {parents === 0 && children === 0 ? (
          <span className="text-clay">Not yet connected</span>
        ) : (
          [
            parents > 0 && `${parents} ${parents === 1 ? 'parent' : 'parents'}`,
            children > 0 && `${children} ${children === 1 ? 'child' : 'children'}`,
          ]
            .filter(Boolean)
            .join(' · ')
        )}
      </td>
    </tr>
  );
}
