'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Baby,
  BadgeCheck,
  Briefcase,
  Cake,
  ChevronRight,
  Crosshair,
  Heart,
  Home,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PersonAvatar } from '@/components/person-avatar';
import { useTree } from '@/lib/hooks/use-tree';
import { messageFor } from '@/lib/api-client';
import { childrenOf, displayName, fullName, parentsOf, siblingsOf } from '@/lib/domain/graph';
import { ageBetween, formatPartialDate, lifespanLabel } from '@/lib/domain/dates';
import { connectionPath, describeRelationship } from '@/lib/domain/kinship';
import { cn } from '@/lib/utils';
import type { Person } from '@/lib/domain/types';
import type { RelativeKind } from '../canvas/canvas-context';

interface PersonPanelProps {
  personId: string | null;
  onClose: () => void;
  onSelect: (personId: string) => void;
  onEdit: (personId: string) => void;
  onAddRelative: (personId: string, kind: RelativeKind, unionId?: string) => void;
  onEditUnion: (unionId: string) => void;
}

export function PersonPanel({
  personId,
  onClose,
  onSelect,
  onEdit,
  onAddRelative,
  onEditUnion,
}: PersonPanelProps) {
  const { index } = useTree();
  const person = personId ? index.personById.get(personId) : null;
  const open = Boolean(person);

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'z-20 shrink-0 overflow-hidden border-l border-border bg-card transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'absolute inset-y-0 right-0 w-full sm:relative sm:inset-auto',
        open ? 'translate-x-0 sm:w-[26rem]' : 'pointer-events-none translate-x-full sm:w-0 sm:translate-x-0',
      )}
    >
      {person && (
        <PanelBody
          key={person.id}
          person={person}
          onClose={onClose}
          onSelect={onSelect}
          onEdit={onEdit}
          onAddRelative={onAddRelative}
          onEditUnion={onEditUnion}
        />
      )}
    </aside>
  );
}

function PanelBody({
  person,
  onClose,
  onSelect,
  onEdit,
  onAddRelative,
  onEditUnion,
}: {
  person: Person;
} & Omit<PersonPanelProps, 'personId'>) {
  const { index, canEdit, mePersonId, claimPerson } = useTree();
  const [claiming, setClaiming] = useState(false);

  const parents = parentsOf(index, person.id);
  const siblings = siblingsOf(index, person.id);
  const children = childrenOf(index, person.id);
  const unions = index.unionsOf.get(person.id) ?? [];

  const isMe = person.id === mePersonId;

  const relationship = useMemo(
    () => (mePersonId && !isMe ? describeRelationship(index, mePersonId, person.id) : null),
    [index, mePersonId, person.id, isMe],
  );

  const path = useMemo(
    () => (mePersonId && !isMe ? connectionPath(index, mePersonId, person.id) : null),
    [index, mePersonId, person.id, isMe],
  );

  const age = person.isLiving
    ? ageBetween(person.birthDate)
    : ageBetween(person.birthDate, person.deathDate);

  const claim = async () => {
    setClaiming(true);
    try {
      await claimPerson(person.id, !isMe);
      toast.success(
        isMe
          ? 'Unlinked from your account.'
          : `You are now linked to ${displayName(person)} — relationships will be phrased from here.`,
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col sm:w-[26rem]">
      <div className="flex items-start gap-3 border-b border-border p-5">
        <PersonAvatar person={person} size="2xl" />

        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-xl leading-tight font-semibold tracking-tight">
            {fullName(person) || 'Unnamed'}
          </h2>
          {person.nickname && (
            <p className="text-sm text-muted-foreground">known as {person.nickname}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {lifespanLabel(person) || 'Dates not recorded'}
            {age !== null && ` · ${person.isLiving ? `${age} years old` : `aged ${age}`}`}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {isMe && (
              <Badge variant="ochre" className="gap-1">
                <BadgeCheck className="size-3" />
                This is you
              </Badge>
            )}
            {relationship && relationship.kind !== 'unrelated' && (
              <Badge variant="sage">Your {relationship.label.toLowerCase()}</Badge>
            )}
            {!person.isLiving && <Badge variant="muted">No longer living</Badge>}
            {person.redacted && (
              <Badge variant="muted" className="gap-1">
                <Lock className="size-3" />
                Details protected
              </Badge>
            )}
          </div>
        </div>

        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        {canEdit && (
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(person.id)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Add relative
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs">
                  Add someone to {person.givenName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAddRelative(person.id, 'parent')}>
                  <UserRound className="size-4" />A parent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddRelative(person.id, 'partner')}>
                  <Heart className="size-4" />A partner
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAddRelative(person.id, 'child', unions[0]?.id)}
                >
                  <Baby className="size-4" />A child
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAddRelative(person.id, 'sibling')}
                  disabled={parents.length === 0}
                >
                  <Sparkles className="size-4" />
                  A sibling
                  {parents.length === 0 && (
                    <span className="ml-auto text-[10px] text-muted-foreground">needs a parent</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto"
              onClick={claim}
              disabled={claiming}
              aria-label={isMe ? 'Unlink your account' : 'This is me'}
            >
              <Crosshair className={cn('size-4', isMe && 'text-ochre')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-52">
            {isMe
              ? 'Unlink your account from this person'
              : 'Mark this as you — every relationship in the tree is then phrased from here'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {path && path.length > 2 && (
          <section className="border-b border-border bg-surface-sunken/50 px-5 py-4">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              How you&apos;re connected
            </h3>
            <ol className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
              {path.map((step, stepIndex) => (
                <li key={step.personId} className="flex items-center gap-1">
                  {stepIndex > 0 && <ChevronRight className="size-3 text-muted-foreground/60" />}
                  <button
                    type="button"
                    onClick={() => onSelect(step.personId)}
                    className={cn(
                      'rounded px-1 py-0.5 transition-colors hover:bg-accent',
                      stepIndex === path.length - 1 ? 'font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {stepIndex === 0 ? 'You' : step.name}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        <Facts person={person} />

        {person.bio && (
          <section className="border-b border-border px-5 py-5">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Their story
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {person.bio}
            </p>
          </section>
        )}

        <RelationGroup
          title="Parents"
          people={parents}
          onSelect={onSelect}
          emptyAction={
            canEdit ? { label: 'Add a parent', onClick: () => onAddRelative(person.id, 'parent') } : undefined
          }
        />

        {unions.length > 0 && (
          <section className="border-b border-border px-5 py-5">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {unions.length === 1 ? 'Partner' : 'Partners'}
            </h3>
            <ul className="mt-2.5 space-y-1">
              {unions.map((union) => {
                const partnerId = union.partnerIds.find((id) => id !== person.id);
                const partner = partnerId ? index.personById.get(partnerId) : null;
                if (!partner) return null;

                const detail = [
                  union.status === 'DIVORCED'
                    ? 'Divorced'
                    : union.status === 'WIDOWED'
                      ? 'Widowed'
                      : union.status === 'SEPARATED'
                        ? 'Separated'
                        : union.kind === 'MARRIAGE'
                          ? 'Married'
                          : 'Together',
                  formatPartialDate(union.startDate, 'short'),
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <li key={union.id}>
                    <PersonRow
                      person={partner}
                      detail={detail}
                      onSelect={onSelect}
                      action={
                        canEdit
                          ? {
                              label: 'Marriage details',
                              onClick: () => onEditUnion(union.id),
                            }
                          : undefined
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <RelationGroup
          title="Siblings"
          people={siblings.map((sibling) => sibling.person)}
          details={siblings.map((sibling) => (sibling.degree === 'half' ? 'Half-sibling' : ''))}
          onSelect={onSelect}
        />

        <RelationGroup
          title="Children"
          people={children}
          onSelect={onSelect}
          emptyAction={
            canEdit
              ? {
                  label: 'Add a child',
                  onClick: () => onAddRelative(person.id, 'child', unions[0]?.id),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

function Facts({ person }: { person: Person }) {
  const facts = [
    person.birthDate || person.birthPlace
      ? {
          icon: Cake,
          label: 'Born',
          value: [formatPartialDate(person.birthDate), person.birthPlace].filter(Boolean).join(' · '),
        }
      : null,
    !person.isLiving && (person.deathDate || person.deathPlace)
      ? {
          icon: Sparkles,
          label: 'Died',
          value: [formatPartialDate(person.deathDate), person.deathPlace].filter(Boolean).join(' · '),
        }
      : null,
    person.residencePlace
      ? { icon: Home, label: person.isLiving ? 'Lives in' : 'Last lived in', value: person.residencePlace }
      : null,
    person.occupation ? { icon: Briefcase, label: 'Worked as', value: person.occupation } : null,
  ].filter(Boolean) as { icon: typeof Cake; label: string; value: string }[];

  if (facts.length === 0) {
    return (
      <section className="border-b border-border px-5 py-5">
        <p className="text-sm text-muted-foreground italic">
          {person.redacted
            ? 'This tree protects the details of living people.'
            : 'Nothing recorded yet — dates, places and a story all belong here.'}
        </p>
      </section>
    );
  }

  return (
    <section className="border-b border-border px-5 py-5">
      <dl className="space-y-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex gap-3">
            <fact.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">
                {fact.label}
              </dt>
              <dd className="text-sm leading-snug">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RelationGroup({
  title,
  people,
  details,
  onSelect,
  emptyAction,
}: {
  title: string;
  people: Person[];
  details?: string[];
  onSelect: (personId: string) => void;
  emptyAction?: { label: string; onClick: () => void };
}) {
  if (people.length === 0 && !emptyAction) return null;

  return (
    <section className="border-b border-border px-5 py-5">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>

      {people.length === 0 ? (
        <button
          type="button"
          onClick={emptyAction?.onClick}
          className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-ochre/40 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          {emptyAction?.label}
        </button>
      ) : (
        <ul className="mt-2.5 space-y-1">
          {people.map((person, personIndex) => (
            <li key={person.id}>
              <PersonRow
                person={person}
                detail={details?.[personIndex] || lifespanLabel(person)}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonRow({
  person,
  detail,
  onSelect,
  action,
}: {
  person: Person;
  detail?: string;
  onSelect: (personId: string) => void;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="group flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(person.id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
      >
        <PersonAvatar person={person} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{displayName(person)}</span>
          {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
        </span>
      </button>

      {action && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={action.onClick}
              aria-label={action.label}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Heart className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
