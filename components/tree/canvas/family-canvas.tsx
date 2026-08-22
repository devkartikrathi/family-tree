'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type BuiltInEdge,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { useTree } from '@/lib/hooks/use-tree';
import { childrenOf, displayName, parentsOf, partnersOf, siblingsOf } from '@/lib/domain/graph';
import { CARD_HEIGHT, CARD_WIDTH, KNOT_SIZE } from '@/lib/domain/layout';
import type { ParentLink } from '@/lib/domain/types';
import { CanvasProvider, type CanvasActions, type RelativeKind } from './canvas-context';
import { CanvasControls } from './canvas-controls';
import { PersonNode, type PersonNodeData } from './person-node';
import { UnionNode, type UnionNodeData } from './union-node';

const nodeTypes = { person: PersonNode, union: UnionNode };

const DASHED_KINDS = new Set<ParentLink['kind']>(['ADOPTED', 'STEP', 'FOSTER', 'GUARDIAN']);

interface FamilyCanvasProps {
  selectedId: string | null;
  onSelect(personId: string | null): void;
  onAddRelative(personId: string, kind: RelativeKind, unionId?: string): void;
  onAddFirstPerson(): void;
  onEditUnion(unionId: string): void;
}

export function FamilyCanvas(props: FamilyCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  selectedId,
  onSelect,
  onAddRelative,
  onAddFirstPerson,
  onEditUnion,
}: FamilyCanvasProps) {
  const { persons, unions, links, index, layout, canEdit, mePersonId } = useTree();
  const flow = useReactFlow();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /**
   * Fitting a whole family into a phone's width shrinks the cards to a smear.
   * On a small screen we'd rather open at a readable scale and let people pan;
   * the "fit the whole tree" button is still there when they want the shape.
   * Read once, on mount — React Flow only consults this for the initial fit.
   */
  const [fitViewOptions] = useState(() => ({
    padding: 0.24,
    maxZoom: 1,
    minZoom: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.55 : 0.08,
  }));

  /** Where each card sits — always the computed generation row. */
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const person of persons) {
      const point = layout.persons.get(person.id);
      if (point) map.set(person.id, point);
    }
    return map;
  }, [persons, layout]);

  const knots = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const union of unions) {
      const points = union.partnerIds
        .map((id) => positions.get(id))
        .filter((p): p is { x: number; y: number } => Boolean(p));
      if (points.length === 0) continue;
      map.set(union.id, {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      });
    }
    return map;
  }, [unions, positions]);

  /** Selecting somebody softens everyone who isn't immediate family. */
  const focusIds = useMemo(() => {
    if (!selectedId || !index.personById.has(selectedId)) return null;
    const ids = new Set<string>([selectedId]);
    for (const person of parentsOf(index, selectedId)) ids.add(person.id);
    for (const person of childrenOf(index, selectedId)) ids.add(person.id);
    for (const person of partnersOf(index, selectedId)) ids.add(person.id);
    for (const sibling of siblingsOf(index, selectedId)) ids.add(sibling.person.id);
    return ids;
  }, [selectedId, index]);

  const nodes = useMemo<Node[]>(() => {
    const personNodes: Node[] = persons.flatMap((person) => {
      const point = positions.get(person.id);
      if (!point) return [];
      return [
        {
          id: person.id,
          type: 'person',
          position: { x: point.x - CARD_WIDTH / 2, y: point.y - CARD_HEIGHT / 2 },
          selected: person.id === selectedId,
          draggable: false,
          data: {
            person,
            isMe: person.id === mePersonId,
            canEdit,
            primaryUnionId: index.unionsOf.get(person.id)?.[0]?.id ?? null,
          } satisfies PersonNodeData,
        },
      ];
    });

    const unionNodes: Node[] = unions.flatMap((union) => {
      const point = knots.get(union.id);
      if (!point) return [];
      return [
        {
          id: `union:${union.id}`,
          type: 'union',
          position: { x: point.x - KNOT_SIZE / 2, y: point.y - KNOT_SIZE / 2 },
          draggable: false,
          selectable: false,
          data: {
            union,
            names: union.partnerIds
              .map((id) => index.personById.get(id))
              .filter(Boolean)
              .map((person) => displayName(person!)),
            canEdit,
          } satisfies UnionNodeData,
        },
      ];
    });

    return [...unionNodes, ...personNodes];
  }, [persons, unions, positions, knots, selectedId, canEdit, mePersonId, index]);

  const edges = useMemo<Edge[]>(() => {
    // Typed as the built-in union so `pathOptions` on smoothstep edges is checked.
    const result: BuiltInEdge[] = [];
    const isLit = (...ids: string[]) => focusIds === null || ids.some((id) => focusIds.has(id));

    // Partner bars: each half of a couple reaches in to the knot.
    for (const union of unions) {
      const knot = knots.get(union.id);
      if (!knot) continue;

      for (const partnerId of union.partnerIds) {
        const point = positions.get(partnerId);
        if (!point) continue;
        const onLeft = point.x <= knot.x;

        result.push({
          id: `partner:${union.id}:${partnerId}`,
          source: partnerId,
          sourceHandle: onLeft ? 'right' : 'left',
          target: `union:${union.id}`,
          targetHandle: onLeft ? 'left' : 'right',
          type: 'straight',
          className: isLit(partnerId) ? undefined : 'is-dimmed',
          style: {
            stroke: 'var(--ochre)',
            strokeWidth: 2,
            strokeDasharray: union.status === 'DIVORCED' ? '4 4' : undefined,
          },
        });
      }
    }

    // Parent bars: one line per couple down to each child, or a direct line
    // from a lone recorded parent.
    const drawnFromUnion = new Set<string>();

    for (const link of links) {
      const child = positions.get(link.childId);
      if (!child) continue;

      const dashed = DASHED_KINDS.has(link.kind);
      const viaUnion = link.unionId && knots.has(link.unionId) ? link.unionId : null;

      if (viaUnion) {
        const key = `${viaUnion}:${link.childId}`;
        if (drawnFromUnion.has(key)) continue;
        drawnFromUnion.add(key);

        result.push({
          id: `child:${key}`,
          source: `union:${viaUnion}`,
          sourceHandle: 'bottom',
          target: link.childId,
          targetHandle: 'top',
          type: 'smoothstep',
          pathOptions: { borderRadius: 14 },
          className: isLit(link.childId, ...(index.unionById.get(viaUnion)?.partnerIds ?? []))
            ? undefined
            : 'is-dimmed',
          style: {
            stroke: 'var(--edge-line-strong)',
            strokeWidth: 1.5,
            strokeDasharray: dashed ? '5 4' : undefined,
          },
        });
        continue;
      }

      if (!positions.has(link.parentId)) continue;
      result.push({
        id: `link:${link.id}`,
        source: link.parentId,
        sourceHandle: 'bottom',
        target: link.childId,
        targetHandle: 'top',
        type: 'smoothstep',
        pathOptions: { borderRadius: 14 },
        className: isLit(link.parentId, link.childId) ? undefined : 'is-dimmed',
        style: {
          stroke: 'var(--edge-line-strong)',
          strokeWidth: 1.5,
          strokeDasharray: dashed ? '5 4' : undefined,
        },
      });
    }

    return result;
  }, [unions, links, positions, knots, focusIds, index]);

  const canvasActions = useMemo<CanvasActions>(
    () => ({
      selectedId,
      hoveredId,
      focusIds,
      select: onSelect,
      hover: setHoveredId,
      addRelative: onAddRelative,
      editUnion: onEditUnion,
    }),
    [selectedId, hoveredId, focusIds, onSelect, onAddRelative, onEditUnion],
  );

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (node.type === 'person') onSelect(node.id);
    },
    [onSelect],
  );

  // Bring the selected person into view when the selection came from elsewhere
  // — search, the people table, a deep link.
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || selectedId === lastFocused.current) return;
    const point = positions.get(selectedId);
    if (!point) return;
    lastFocused.current = selectedId;
    const timer = setTimeout(() => {
      flow.setCenter(point.x, point.y, { zoom: Math.max(flow.getZoom(), 0.75), duration: 500 });
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedId, positions, flow]);

  if (persons.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={<UserPlus className="size-6" />}
          title="An empty tree, for now"
          description="Add yourself first. From there, every person you add offers the next question — who were their parents, who did they marry."
          action={
            canEdit ? (
              <Button size="lg" className="gap-2" onClick={onAddFirstPerson}>
                <UserPlus className="size-4" />
                Add the first person
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask an admin for editing access to start adding people.
              </p>
            )
          }
        />
      </div>
    );
  }

  return (
    <CanvasProvider value={canvasActions}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => onSelect(null)}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.08}
          maxZoom={1.75}
          zoomOnDoubleClick={false}
          panOnScroll
          selectionOnDrag={false}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={26}
            size={1.4}
            color="var(--canvas-grid)"
          />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="!hidden lg:!block"
            maskColor="color-mix(in oklab, var(--background) 72%, transparent)"
            nodeColor={(node) =>
              node.type === 'union' ? 'var(--ochre)' : 'var(--line-strong)'
            }
            nodeStrokeWidth={0}
            nodeBorderRadius={3}
          />
        </ReactFlow>

        <CanvasControls />
      </div>
    </CanvasProvider>
  );
}
