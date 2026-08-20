'use client';

import { useMemo, useState } from 'react';
import {
  CalendarRange,
  Map,
  Network,
  Plus,
  Table2,
  Users,
} from 'lucide-react';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { PersonAvatar } from '@/components/person-avatar';
import { useTree } from '@/lib/hooks/use-tree';
import { displayName } from '@/lib/domain/graph';
import { lifespanLabel, yearOf } from '@/lib/domain/dates';
import { describeRelationship } from '@/lib/domain/kinship';
import type { Person } from '@/lib/domain/types';
import type { ViewKey } from './workspace-header';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPerson: (personId: string) => void;
  onChangeView: (view: ViewKey) => void;
  onAddPerson: () => void;
  onOpenMembers: () => void;
}

/**
 * Search that understands what people actually half-remember: a name, a town, a
 * job, or just "somebody born in the fifties".
 */
function scoreOf(person: Person, query: string): number {
  const name = displayName(person).toLowerCase();
  const haystacks = [
    { text: name, weight: 100 },
    { text: (person.nickname ?? '').toLowerCase(), weight: 80 },
    { text: (person.maidenName ?? '').toLowerCase(), weight: 70 },
    { text: (person.birthPlace ?? '').toLowerCase(), weight: 40 },
    { text: (person.residencePlace ?? '').toLowerCase(), weight: 40 },
    { text: (person.deathPlace ?? '').toLowerCase(), weight: 30 },
    { text: (person.occupation ?? '').toLowerCase(), weight: 35 },
  ];

  let best = 0;
  for (const { text, weight } of haystacks) {
    if (!text) continue;
    if (text.startsWith(query)) best = Math.max(best, weight + 20);
    else if (text.includes(query)) best = Math.max(best, weight);
  }

  const year = Number(query);
  if (!Number.isNaN(year) && query.length === 4) {
    const birth = yearOf(person.birthDate);
    const death = yearOf(person.deathDate);
    if (birth === year || death === year) best = Math.max(best, 90);
    else if (birth && Math.abs(birth - year) <= 5) best = Math.max(best, 45);
  }

  return best;
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectPerson,
  onChangeView,
  onAddPerson,
  onOpenMembers,
}: CommandPaletteProps) {
  const { persons, index, mePersonId, canEdit, tree } = useTree();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) {
      return persons
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6);
    }
    return persons
      .map((person) => ({ person, score: scoreOf(person, cleaned) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || displayName(a.person).localeCompare(displayName(b.person)))
      .slice(0, 12)
      .map((entry) => entry.person);
  }, [persons, query]);

  const run = (action: () => void) => {
    onOpenChange(false);
    setQuery('');
    // Let the dialog finish closing so focus lands where the action put it.
    setTimeout(action, 10);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search this tree"
      description="Find a person, or jump to a view"
      shouldFilter={false}
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search a name, a town, a job, a year…"
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-[26rem]">
        {query.trim() && matches.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nobody in {tree.name} matches “{query.trim()}”.
          </p>
        )}

        {matches.length > 0 && (
          <CommandGroup heading={query.trim() ? 'People' : 'Recently changed'}>
            {matches.map((person) => {
              const relationship =
                mePersonId && person.id !== mePersonId
                  ? describeRelationship(index, mePersonId, person.id)
                  : null;

              return (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  onSelect={() => run(() => onSelectPerson(person.id))}
                  className="gap-3 py-2.5"
                >
                  <PersonAvatar person={person} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{displayName(person)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[lifespanLabel(person), person.birthPlace ?? person.residencePlace]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {person.id === mePersonId ? (
                    <span className="shrink-0 text-[10px] font-semibold tracking-wide text-ochre uppercase">
                      You
                    </span>
                  ) : relationship && relationship.kind !== 'unrelated' ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relationship.label}
                    </span>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Go to">
          <CommandItem value="view tree" onSelect={() => run(() => onChangeView('tree'))}>
            <Network className="size-4" />
            The tree
          </CommandItem>
          <CommandItem value="view map" onSelect={() => run(() => onChangeView('map'))}>
            <Map className="size-4" />
            The map
          </CommandItem>
          <CommandItem value="view timeline" onSelect={() => run(() => onChangeView('timeline'))}>
            <CalendarRange className="size-4" />
            The timeline
          </CommandItem>
          <CommandItem value="view people" onSelect={() => run(() => onChangeView('people'))}>
            <Table2 className="size-4" />
            Everyone, as a list
          </CommandItem>
          <CommandItem value="members" onSelect={() => run(onOpenMembers)}>
            <Users className="size-4" />
            Members &amp; invites
          </CommandItem>
        </CommandGroup>

        {canEdit && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Add">
              <CommandItem value="add person" onSelect={() => run(onAddPerson)}>
                <Plus className="size-4" />
                Add a person
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
