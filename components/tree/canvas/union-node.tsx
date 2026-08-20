'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPartialDate } from '@/lib/domain/dates';
import { KNOT_SIZE } from '@/lib/domain/layout';
import { cn } from '@/lib/utils';
import type { Union } from '@/lib/domain/types';
import { useCanvas } from './canvas-context';

export interface UnionNodeData extends Record<string, unknown> {
  union: Union;
  names: string[];
  canEdit: boolean;
}

const STATUS_STYLE: Record<Union['status'], string> = {
  CURRENT: 'bg-ochre border-ochre',
  SEPARATED: 'bg-card border-ochre',
  DIVORCED: 'bg-card border-muted-foreground',
  WIDOWED: 'bg-muted-foreground/60 border-muted-foreground',
  UNKNOWN: 'bg-ochre/60 border-ochre/60',
};

const STATUS_WORD: Record<Union['status'], string> = {
  CURRENT: 'Married',
  SEPARATED: 'Separated',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  UNKNOWN: 'Together',
};

/**
 * The small diamond between two partners. It carries the marriage itself —
 * dates, place, whether it ended — and it is what a sibling group hangs from,
 * which is why it exists as a node rather than a decoration on an edge.
 */
function UnionNodeComponent({ data }: NodeProps) {
  const { union, names, canEdit } = data as UnionNodeData;
  const { focusIds, editUnion } = useCanvas();

  const dimmed = focusIds !== null && !union.partnerIds.some((id) => focusIds.has(id));
  const ended = union.status === 'DIVORCED' || union.status === 'SEPARATED';
  const when = formatPartialDate(union.startDate, 'short');

  return (
    <div
      style={{ width: KNOT_SIZE, height: KNOT_SIZE }}
      className={cn('relative transition-opacity duration-200', dimmed && 'opacity-25')}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${STATUS_WORD[union.status]}: ${names.join(' and ')}`}
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              if (canEdit) editUnion(union.id);
            }}
            className={cn(
              'size-full rotate-45 rounded-[3px] border-2 transition-transform',
              STATUS_STYLE[union.status],
              canEdit && 'hover:scale-125',
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-center">
          <span className="block font-medium">{names.join(' & ')}</span>
          <span className="block text-muted-foreground">
            {STATUS_WORD[union.status]}
            {when ? ` · ${when}` : ''}
            {ended && union.endDate ? ` – ${formatPartialDate(union.endDate, 'short')}` : ''}
          </span>
          {canEdit && <span className="mt-1 block text-[10px] opacity-70">Click to edit</span>}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export const UnionNode = memo(UnionNodeComponent);
UnionNode.displayName = 'UnionNode';
