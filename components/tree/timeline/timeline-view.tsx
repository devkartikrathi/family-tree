'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarRange, Cake, Heart, HeartCrack, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { PersonAvatar } from '@/components/person-avatar';
import { useTree } from '@/lib/hooks/use-tree';
import { displayName } from '@/lib/domain/graph';
import { comparePartialDates, formatPartialDate, yearOf } from '@/lib/domain/dates';
import { cn } from '@/lib/utils';
import type { Person } from '@/lib/domain/types';

type EventKind = 'birth' | 'marriage' | 'death' | 'separation';

interface LifeEvent {
  id: string;
  kind: EventKind;
  date: string;
  year: number;
  people: Person[];
  sentence: string;
  place: string | null;
}

const ICONS: Record<EventKind, typeof Cake> = {
  birth: Cake,
  marriage: Heart,
  death: Sparkles,
  separation: HeartCrack,
};

const TONES: Record<EventKind, string> = {
  birth: 'text-sage bg-sage-soft',
  marriage: 'text-ochre bg-ochre-soft',
  death: 'text-muted-foreground bg-muted',
  separation: 'text-clay bg-clay-soft',
};

const FILTERS: { key: EventKind | 'all'; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'birth', label: 'Births' },
  { key: 'marriage', label: 'Marriages' },
  { key: 'death', label: 'Deaths' },
];

/**
 * A family's history is easier to feel as a sequence than as a diagram. Every
 * dated fact in the tree lands here in order, grouped by decade, so a century
 * of a family reads top to bottom.
 */
export function TimelineView({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (personId: string) => void;
}) {
  const { persons, unions, index } = useTree();
  const [filter, setFilter] = useState<EventKind | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useMemo<LifeEvent[]>(() => {
    const result: LifeEvent[] = [];

    for (const person of persons) {
      if (person.birthDate) {
        const year = yearOf(person.birthDate);
        if (year !== null) {
          result.push({
            id: `birth:${person.id}`,
            kind: 'birth',
            date: person.birthDate,
            year,
            people: [person],
            sentence: `${displayName(person)} was born`,
            place: person.birthPlace,
          });
        }
      }

      if (!person.isLiving && person.deathDate) {
        const year = yearOf(person.deathDate);
        if (year !== null) {
          result.push({
            id: `death:${person.id}`,
            kind: 'death',
            date: person.deathDate,
            year,
            people: [person],
            sentence: `${displayName(person)} died`,
            place: person.deathPlace,
          });
        }
      }
    }

    for (const union of unions) {
      const partners = union.partnerIds
        .map((id) => index.personById.get(id))
        .filter((person): person is Person => Boolean(person));
      if (partners.length === 0) continue;

      const names = partners.map(displayName).join(' and ');

      if (union.startDate) {
        const year = yearOf(union.startDate);
        if (year !== null) {
          result.push({
            id: `marriage:${union.id}`,
            kind: 'marriage',
            date: union.startDate,
            year,
            people: partners,
            sentence: `${names} ${union.kind === 'MARRIAGE' ? 'married' : 'became partners'}`,
            place: union.place,
          });
        }
      }

      if (union.endDate && (union.status === 'DIVORCED' || union.status === 'SEPARATED')) {
        const year = yearOf(union.endDate);
        if (year !== null) {
          result.push({
            id: `separation:${union.id}`,
            kind: 'separation',
            date: union.endDate,
            year,
            people: partners,
            sentence: `${names} ${union.status === 'DIVORCED' ? 'divorced' : 'separated'}`,
            place: null,
          });
        }
      }
    }

    return result.sort((a, b) => comparePartialDates(a.date, b.date));
  }, [persons, unions, index]);

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.kind === filter)),
    [events, filter],
  );

  const decades = useMemo(() => {
    const groups = new Map<number, LifeEvent[]>();
    for (const event of visible) {
      const decade = Math.floor(event.year / 10) * 10;
      const list = groups.get(decade);
      if (list) list.push(event);
      else groups.set(decade, [event]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  if (events.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={<CalendarRange className="size-6" />}
          title="No dates recorded yet"
          description="Add a birth year to anyone and they will appear here. Even a rough year is enough — this timeline is built for incomplete memories."
        />
      </div>
    );
  }

  const span = { from: events[0].year, to: events[events.length - 1].year };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            {span.from} – {span.to}
          </p>
          <p className="text-sm text-muted-foreground">
            {events.length} recorded {events.length === 1 ? 'moment' : 'moments'} across{' '}
            {span.to - span.from} years
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === option.key
                  ? 'border-ochre/40 bg-ochre-soft text-ochre'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
          {decades.map(([decade, decadeEvents]) => (
            <section key={decade} className="relative">
              <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:px-5">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{decade}s</h2>
                  <span className="hidden text-xs whitespace-nowrap text-muted-foreground sm:inline">
                    {decadeEvents.length} {decadeEvents.length === 1 ? 'moment' : 'moments'}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>

              <ol className="relative mt-3 mb-8 space-y-1 border-l border-border pl-5 sm:pl-6">
                {decadeEvents.map((event) => {
                  const Icon = ICONS[event.kind];
                  const active = event.people.some((person) => person.id === selectedId);

                  return (
                    <li key={event.id} className="relative">
                      <span
                        className={cn(
                          'absolute top-3.5 -left-[1.72rem] grid size-6 place-items-center rounded-full ring-4 ring-background sm:-left-[1.97rem]',
                          TONES[event.kind],
                        )}
                      >
                        <Icon className="size-3" />
                      </span>

                      <button
                        type="button"
                        onClick={() => onSelect(event.people[0].id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors sm:gap-3 sm:px-3',
                          active ? 'bg-ochre-soft/50' : 'hover:bg-muted/60',
                        )}
                      >
                        <div className="flex -space-x-2">
                          {event.people.slice(0, 2).map((person) => (
                            <PersonAvatar
                              key={person.id}
                              person={person}
                              size="sm"
                              className="ring-2 ring-card"
                            />
                          ))}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm sm:line-clamp-1">
                            {event.sentence}
                            {event.place && (
                              <span className="text-muted-foreground"> in {event.place}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPartialDate(event.date)}
                          </p>
                        </div>

                        <Badge variant="muted" className="shrink-0 font-mono">
                          {event.year}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
