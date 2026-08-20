'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useTree } from '@/lib/hooks/use-tree';
import { FamilyCanvas } from './canvas/family-canvas';
import type { RelativeKind } from './canvas/canvas-context';
import { CommandPalette } from './command-palette';
import { MembersPanel } from './members/members-panel';
import { PersonEditorDialog, type EditorIntent } from './panels/person-editor';
import { PersonPanel } from './panels/person-panel';
import { UnionEditorDialog } from './panels/union-editor';
import { PeopleView } from './people/people-view';
import { TimelineView } from './timeline/timeline-view';
import { MobileViewBar, WorkspaceHeader, type ViewKey } from './workspace-header';

const MapView = dynamic(() => import('./map/map-view').then((module) => module.MapView), {
  ssr: false,
  loading: () => <ViewLoading label="Bringing up the map…" />,
});

const VIEWS: ViewKey[] = ['tree', 'map', 'timeline', 'people'];

export function Workspace() {
  return (
    <Suspense fallback={<ViewLoading label="Opening your tree…" />}>
      <WorkspaceInner />
    </Suspense>
  );
}

function WorkspaceInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { persons, index, canEdit } = useTree();

  const view = useMemo<ViewKey>(() => {
    const requested = searchParams.get('view') as ViewKey | null;
    return requested && VIEWS.includes(requested) ? requested : 'tree';
  }, [searchParams]);

  const personParam = searchParams.get('person');
  const selectedId = personParam && index.personById.has(personParam) ? personParam : null;

  const [membersOpen, setMembersOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<EditorIntent | null>(null);
  const [unionEditorId, setUnionEditorId] = useState<string | null>(null);

  /**
   * View and selection live in the URL, so a link to a cousin opens on that
   * cousin and the browser's back button does what people expect.
   */
  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const select = useCallback((personId: string | null) => setParams({ person: personId }), [setParams]);
  const setView = useCallback((next: ViewKey) => setParams({ view: next }), [setParams]);

  const addRelative = useCallback(
    (personId: string, kind: RelativeKind, unionId?: string) => {
      setEditor({ mode: 'create', relateTo: { personId, as: kind, unionId: unionId ?? null } });
    },
    [],
  );

  const addFirstPerson = useCallback(() => setEditor({ mode: 'create' }), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;

      if (event.key === '/') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === 'Escape') {
        if (selectedId) select(null);
      } else if (event.key.toLowerCase() === 'n' && canEdit && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setEditor(selectedId ? { mode: 'create', relateTo: { personId: selectedId, as: 'child', unionId: null } } : { mode: 'create' });
      } else if (event.key.toLowerCase() === 'e' && canEdit && selectedId) {
        event.preventDefault();
        setEditor({ mode: 'edit', personId: selectedId });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, select, canEdit]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <WorkspaceHeader
        view={view}
        onViewChange={setView}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenMembers={() => setMembersOpen(true)}
        onAddPerson={() =>
          setEditor(
            selectedId
              ? { mode: 'create', relateTo: { personId: selectedId, as: 'child', unionId: null } }
              : { mode: 'create' },
          )
        }
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {view === 'tree' && (
            <FamilyCanvas
              selectedId={selectedId}
              onSelect={select}
              onAddRelative={addRelative}
              onAddFirstPerson={addFirstPerson}
              onEditUnion={setUnionEditorId}
            />
          )}
          {view === 'map' && <MapView selectedId={selectedId} onSelect={select} />}
          {view === 'timeline' && <TimelineView selectedId={selectedId} onSelect={select} />}
          {view === 'people' && (
            <PeopleView
              selectedId={selectedId}
              onSelect={select}
              onAddPerson={addFirstPerson}
            />
          )}
        </div>

        <PersonPanel
          personId={selectedId}
          onClose={() => select(null)}
          onSelect={select}
          onEdit={(personId) => setEditor({ mode: 'edit', personId })}
          onAddRelative={addRelative}
          onEditUnion={setUnionEditorId}
        />
      </div>

      <MobileViewBar view={view} onViewChange={setView} />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSelectPerson={(personId) => {
          select(personId);
          if (view !== 'tree' && view !== 'people') setView('tree');
        }}
        onChangeView={setView}
        onAddPerson={addFirstPerson}
        onOpenMembers={() => setMembersOpen(true)}
      />

      <MembersPanel open={membersOpen} onOpenChange={setMembersOpen} onSelectPerson={select} />

      {editor && (
        <PersonEditorDialog
          intent={editor}
          onClose={() => setEditor(null)}
          onSaved={(personId) => {
            setEditor(null);
            select(personId);
          }}
        />
      )}

      {unionEditorId && (
        <UnionEditorDialog unionId={unionEditorId} onClose={() => setUnionEditorId(null)} />
      )}

      {persons.length > 0 && view === 'tree' && <KeyboardHint />}
    </div>
  );
}

function ViewLoading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

/** Shown once, then remembered — help that gets out of the way. */
function KeyboardHint() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem('legacy:hint-dismissed') === '1');
  }, []);

  if (dismissed) return null;

  return (
    <div className="pointer-events-auto fixed bottom-20 left-1/2 z-30 -translate-x-1/2 md:bottom-6">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 text-xs shadow-[var(--shadow-float)] backdrop-blur">
        <span className="text-muted-foreground">
          Hover anyone to add a <strong className="font-medium text-foreground">parent</strong>,{' '}
          <strong className="font-medium text-foreground">partner</strong> or{' '}
          <strong className="font-medium text-foreground">child</strong>. Press{' '}
          <kbd className="rounded border border-border bg-muted px-1 font-mono">⌘K</kbd> to search.
        </span>
        <button
          type="button"
          className="font-medium text-ochre hover:underline"
          onClick={() => {
            window.localStorage.setItem('legacy:hint-dismissed', '1');
            setDismissed(true);
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
