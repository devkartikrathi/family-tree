'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronUp, Heart, Lock, Plus } from 'lucide-react';
import { PersonAvatar } from '@/components/person-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { displayName } from '@/lib/domain/graph';
import { lifespanLabel } from '@/lib/domain/dates';
import { CARD_HEIGHT, CARD_WIDTH } from '@/lib/domain/layout';
import { cn } from '@/lib/utils';
import type { Person } from '@/lib/domain/types';
import { useCanvas } from './canvas-context';

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  isMe: boolean;
  canEdit: boolean;
  primaryUnionId: string | null;
}

/**
 * The unit of the whole canvas. Everything about it is in service of two
 * things: reading a name at a glance from any zoom level, and making the next
 * person one click away rather than a form away.
 */
function PersonNodeComponent({ id, data, selected }: NodeProps) {
  const { person, isMe, canEdit, primaryUnionId } = data as PersonNodeData;
  const { hoveredId, focusIds, addRelative, hover } = useCanvas();

  const name = displayName(person);
  const years = lifespanLabel(person);
  const dimmed = focusIds !== null && !focusIds.has(id);
  const active = selected || hoveredId === id;

  const quickAdd = (kind: 'parent' | 'child' | 'partner') => (event: React.MouseEvent) => {
    event.stopPropagation();
    addRelative(id, kind, kind === 'child' ? (primaryUnionId ?? undefined) : undefined);
  };

  return (
    <div
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      onMouseEnter={() => hover(id)}
      onMouseLeave={() => hover(null)}
      className={cn(
        'group relative transition-opacity duration-200',
        dimmed && 'opacity-25',
      )}
    >
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div
        className={cn(
          'flex h-full items-center gap-3 rounded-xl border bg-card px-3.5 transition-all duration-200',
          selected
            ? 'border-ochre shadow-[var(--shadow-lift)] ring-2 ring-ochre/25'
            : 'border-border shadow-[var(--shadow-paper)] hover:border-ochre/45 hover:shadow-[var(--shadow-lift)]',
          !person.isLiving && 'bg-card/80',
        )}
      >
        <PersonAvatar person={person} size="lg" />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-display truncate text-[0.9rem] leading-tight font-semibold tracking-tight',
              !person.isLiving && 'text-foreground/85',
            )}
            title={name}
          >
            {name}
          </p>

          {person.maidenName && (
            <p className="truncate text-[0.7rem] text-muted-foreground/80">
              née {person.maidenName}
            </p>
          )}

          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.72rem] text-muted-foreground">
            {years || <span className="italic opacity-70">dates unknown</span>}
            {person.redacted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="size-2.5 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Details of living people are protected in this tree</TooltipContent>
              </Tooltip>
            )}
          </p>
        </div>

        {isMe && (
          <span className="absolute -top-2 left-3 rounded-full bg-ochre px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-ochre-foreground uppercase">
            You
          </span>
        )}

        {!person.isLiving && (
          <span
            aria-label="No longer living"
            className="absolute top-2 right-2.5 size-1.5 rounded-full bg-muted-foreground/35"
          />
        )}
      </div>

      {/* Quick-add affordances. This is the whole reason nobody has to paste an
          identifier to record a relationship. */}
      {canEdit && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity duration-150',
            active ? 'opacity-100' : 'opacity-0',
          )}
        >
          <QuickAdd
            className="-top-3.5 left-1/2 -translate-x-1/2"
            label="Add a parent"
            icon={<ChevronUp className="size-3" />}
            onClick={quickAdd('parent')}
          />
          <QuickAdd
            className="-bottom-3.5 left-1/2 -translate-x-1/2"
            label="Add a child"
            icon={<ChevronDown className="size-3" />}
            onClick={quickAdd('child')}
          />
          <QuickAdd
            className="top-1/2 -right-3.5 -translate-y-1/2"
            label="Add a partner"
            icon={<Heart className="size-3" />}
            onClick={quickAdd('partner')}
          />
        </div>
      )}
    </div>
  );
}

function QuickAdd({
  className,
  label,
  icon,
  onClick,
}: {
  className: string;
  label: string;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'pointer-events-auto absolute grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-paper)] transition-all',
            'hover:scale-110 hover:border-ochre/50 hover:bg-ochre hover:text-ochre-foreground',
            className,
          )}
        >
          <span className="relative">
            <Plus className="size-3" />
            <span className="sr-only">{label}</span>
          </span>
          <span className="sr-only">{icon}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export const PersonNode = memo(PersonNodeComponent);
PersonNode.displayName = 'PersonNode';
