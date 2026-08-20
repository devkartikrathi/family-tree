'use client';

import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import { Info, Maximize2, Minus, Move, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTree } from '@/lib/hooks/use-tree';
import { messageFor } from '@/lib/api-client';
import { treeStats } from '@/lib/domain/graph';
import { cn } from '@/lib/utils';

export function CanvasControls() {
  const flow = useReactFlow();
  const { tree, canManage, updateTree, index, layout } = useTree();
  const [busy, setBusy] = useState(false);
  const freeform = tree.layoutMode === 'FREEFORM';
  const stats = treeStats(index, layout.generationCount);

  const setLayoutMode = async (mode: 'AUTO' | 'FREEFORM') => {
    setBusy(true);
    try {
      await updateTree({ layoutMode: mode });
      toast.success(
        mode === 'AUTO'
          ? 'Back to automatic layout — generations line themselves up.'
          : 'Freeform layout on. Drag anyone anywhere; positions are saved.',
      );
      if (mode === 'AUTO') setTimeout(() => flow.fitView({ padding: 0.24, duration: 600 }), 80);
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4">
      <div className="pointer-events-auto lg:ml-[13.5rem]">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 bg-card/90 backdrop-blur">
              <Info className="size-3.5" />
              <span className="font-display font-semibold">{stats.people}</span>
              <span className="text-muted-foreground">
                {stats.people === 1 ? 'person' : 'people'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-72">
            <p className="font-display text-sm font-semibold">At a glance</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Stat label="People" value={stats.people} />
              <Stat label="Generations" value={stats.generations} />
              <Stat label="Living" value={stats.living} />
              <Stat label="Marriages" value={stats.unions} />
              <Stat label="Surnames" value={stats.surnames} />
              <Stat label="Places" value={stats.places} />
            </dl>
            {stats.earliestBirth && stats.latestBirth && (
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Recorded births span{' '}
                <span className="font-medium text-foreground">
                  {stats.earliestBirth}–{stats.latestBirth}
                </span>{' '}
                — {stats.latestBirth - stats.earliestBirth} years.
              </p>
            )}
            <Legend />
          </PopoverContent>
        </Popover>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {canManage && (
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/90 p-0.5 backdrop-blur">
            <ModeButton
              active={!freeform}
              disabled={busy}
              icon={<Sparkles className="size-3.5" />}
              label="Automatic layout"
              onClick={() => setLayoutMode('AUTO')}
            />
            <ModeButton
              active={freeform}
              disabled={busy}
              icon={<Move className="size-3.5" />}
              label="Freeform — drag people anywhere"
              onClick={() => setLayoutMode('FREEFORM')}
            />
          </div>
        )}

        <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/90 p-0.5 backdrop-blur">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => flow.zoomOut({ duration: 180 })}
                aria-label="Zoom out"
              >
                <Minus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => flow.fitView({ padding: 0.24, duration: 500 })}
                aria-label="Fit the whole tree"
              >
                <Maximize2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit the whole tree</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => flow.zoomIn({ duration: 180 })}
                aria-label="Zoom in"
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-display font-semibold">{value}</dd>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            'grid size-8 place-items-center rounded-full transition-colors disabled:opacity-50',
            active
              ? 'bg-secondary text-foreground shadow-[var(--shadow-paper)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Legend() {
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Reading the drawing</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rotate-45 rounded-[1px] bg-ochre" />
        A marriage or partnership
      </div>
      <div className="flex items-center gap-2">
        <svg width="22" height="6" aria-hidden>
          <line x1="0" y1="3" x2="22" y2="3" stroke="var(--edge-line-strong)" strokeWidth="1.5" />
        </svg>
        A recorded parent
      </div>
      <div className="flex items-center gap-2">
        <svg width="22" height="6" aria-hidden>
          <line
            x1="0"
            y1="3"
            x2="22"
            y2="3"
            stroke="var(--edge-line-strong)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        </svg>
        Adopted, step, foster or guardian
      </div>
    </div>
  );
}
