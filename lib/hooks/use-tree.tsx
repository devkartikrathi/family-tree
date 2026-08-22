'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { api, messageFor } from '@/lib/api-client';
import { buildIndex, connectedComponents, displayName, type GraphIndex } from '@/lib/domain/graph';
import { computeLayout, type LayoutResult } from '@/lib/domain/layout';
import { describeEvent } from '@/lib/domain/activity';
import type {
  ActivityEvent,
  ParentLink,
  Person,
  PresenceUser,
  Role,
  Tree,
  TreeGraph,
  Union,
} from '@/lib/domain/types';
import type { CreatePersonInput, UpdatePersonInput } from '@/lib/domain/schemas';
import { can } from '@/lib/domain/permissions';

interface TreeStore {
  tree: Tree;
  role: Role;
  persons: Person[];
  unions: Union[];
  links: ParentLink[];
  index: GraphIndex;
  layout: LayoutResult;

  meUserId: string | null;
  mePersonId: string | null;
  canEdit: boolean;
  canManage: boolean;

  presence: PresenceUser[];
  syncing: boolean;
  connection: 'live' | 'connecting' | 'offline';

  refresh(): Promise<void>;

  createPerson(input: CreatePersonInput): Promise<Person>;
  updatePerson(personId: string, patch: UpdatePersonInput): Promise<void>;
  deletePerson(personId: string): Promise<void>;
  claimPerson(personId: string, claim: boolean): Promise<void>;

  createUnion(input: Record<string, unknown>): Promise<Union>;
  updateUnion(unionId: string, patch: Record<string, unknown>): Promise<void>;
  deleteUnion(unionId: string): Promise<void>;

  createLink(input: { parentId: string; childId: string; unionId?: string | null; kind?: string }): Promise<void>;
  deleteLink(linkId: string): Promise<void>;

  updateTree(patch: Record<string, unknown>): Promise<void>;
}

const TreeContext = createContext<TreeStore | null>(null);

export function useTree(): TreeStore {
  const store = useContext(TreeContext);
  if (!store) throw new Error('useTree must be used inside <TreeProvider>');
  return store;
}

export function TreeProvider({
  initial,
  meUserId,
  children,
}: {
  initial: TreeGraph;
  meUserId: string | null;
  children: React.ReactNode;
}) {
  const [graph, setGraph] = useState<TreeGraph>(initial);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<TreeStore['connection']>('connecting');

  const cursorRef = useRef(initial.cursor);
  const treeId = initial.tree.id;

  const index = useMemo(
    () => buildIndex({ persons: graph.persons, unions: graph.unions, links: graph.links }),
    [graph.persons, graph.unions, graph.links],
  );

  const layout = useMemo(() => computeLayout(index, connectedComponents(index)), [index]);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const next = await api<TreeGraph>(`/api/trees/${treeId}/graph`);
      cursorRef.current = next.cursor;
      setGraph(next);
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setSyncing(false);
    }
  }, [treeId]);

  // ---- Live sync -----------------------------------------------------------
  // The server streams the event log; anything another member did means our
  // copy is stale, so we refetch. A family tree is small enough that a whole
  // reload is both instant and always correct.
  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setConnection('connecting');
      source = new EventSource(`/api/trees/${treeId}/stream?cursor=${cursorRef.current}`);

      source.addEventListener('ready', () => setConnection('live'));

      source.addEventListener('changes', (event) => {
        const data = JSON.parse((event as MessageEvent).data) as {
          cursor: number;
          events: ActivityEvent[];
        };
        cursorRef.current = data.cursor;
        if (data.events.length === 0) return;

        void refresh();

        const [first] = data.events;
        toast(describeEvent(first), {
          description:
            data.events.length > 1 ? `and ${data.events.length - 1} more change${data.events.length > 2 ? 's' : ''}` : undefined,
          duration: 5000,
        });
      });

      source.addEventListener('presence', (event) => {
        setPresence(JSON.parse((event as MessageEvent).data) as PresenceUser[]);
      });

      // The server retires long-lived connections on purpose; reconnect at once.
      source.addEventListener('retire', () => {
        source?.close();
        connect();
      });

      source.onerror = () => {
        setConnection('offline');
        source?.close();
        if (!cancelled) retryTimer = setTimeout(connect, 8_000);
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [treeId, refresh]);

  // ---- Local state helpers -------------------------------------------------

  const patchPerson = useCallback((personId: string, patch: Partial<Person>) => {
    setGraph((current) => ({
      ...current,
      persons: current.persons.map((person) =>
        person.id === personId ? { ...person, ...patch } : person,
      ),
    }));
  }, []);

  // ---- Mutations -----------------------------------------------------------

  const createPerson = useCallback<TreeStore['createPerson']>(
    async (input) => {
      const result = await api<{ person: Person; union: Union | null }>(
        `/api/trees/${treeId}/persons`,
        { method: 'POST', body: input },
      );
      // The relationship may have created links we don't know about yet.
      await refresh();
      return result.person;
    },
    [treeId, refresh],
  );

  const updatePerson = useCallback<TreeStore['updatePerson']>(
    async (personId, patch) => {
      const before = graph.persons.find((person) => person.id === personId);
      patchPerson(personId, patch as Partial<Person>);
      try {
        const saved = await api<Person>(`/api/trees/${treeId}/persons/${personId}`, {
          method: 'PATCH',
          body: patch,
        });
        patchPerson(personId, saved);
      } catch (error) {
        if (before) patchPerson(personId, before);
        throw error;
      }
    },
    [treeId, graph.persons, patchPerson],
  );

  const deletePerson = useCallback<TreeStore['deletePerson']>(
    async (personId) => {
      await api(`/api/trees/${treeId}/persons/${personId}`, { method: 'DELETE' });
      await refresh();
    },
    [treeId, refresh],
  );

  const claimPerson = useCallback<TreeStore['claimPerson']>(
    async (personId, claim) => {
      await api(`/api/trees/${treeId}/persons/${personId}/claim`, {
        method: 'POST',
        body: { claim },
      });
      await refresh();
    },
    [treeId, refresh],
  );

  const createUnion = useCallback<TreeStore['createUnion']>(
    async (input) => {
      const union = await api<Union>(`/api/trees/${treeId}/unions`, { method: 'POST', body: input });
      await refresh();
      return union;
    },
    [treeId, refresh],
  );

  const updateUnion = useCallback<TreeStore['updateUnion']>(
    async (unionId, patch) => {
      await api(`/api/trees/${treeId}/unions/${unionId}`, { method: 'PATCH', body: patch });
      await refresh();
    },
    [treeId, refresh],
  );

  const deleteUnion = useCallback<TreeStore['deleteUnion']>(
    async (unionId) => {
      await api(`/api/trees/${treeId}/unions/${unionId}`, { method: 'DELETE' });
      await refresh();
    },
    [treeId, refresh],
  );

  const createLink = useCallback<TreeStore['createLink']>(
    async (input) => {
      await api(`/api/trees/${treeId}/links`, { method: 'POST', body: input });
      await refresh();
    },
    [treeId, refresh],
  );

  const deleteLink = useCallback<TreeStore['deleteLink']>(
    async (linkId) => {
      await api(`/api/trees/${treeId}/links/${linkId}`, { method: 'DELETE' });
      await refresh();
    },
    [treeId, refresh],
  );

  const updateTree = useCallback<TreeStore['updateTree']>(
    async (patch) => {
      const tree = await api<Tree>(`/api/trees/${treeId}`, { method: 'PATCH', body: patch });
      setGraph((current) => ({ ...current, tree }));
    },
    [treeId],
  );

  const mePersonId = useMemo(
    () => graph.persons.find((person) => person.claimedByUserId === meUserId)?.id ?? null,
    [graph.persons, meUserId],
  );

  const store = useMemo<TreeStore>(
    () => ({
      tree: graph.tree,
      role: graph.role,
      persons: graph.persons,
      unions: graph.unions,
      links: graph.links,
      index,
      layout,
      meUserId,
      mePersonId,
      canEdit: can.editPeople(graph.role),
      canManage: can.manageMembers(graph.role),
      presence,
      syncing,
      connection,
      refresh,
      createPerson,
      updatePerson,
      deletePerson,
      claimPerson,
      createUnion,
      updateUnion,
      deleteUnion,
      createLink,
      deleteLink,
      updateTree,
    }),
    [
      graph, index, layout, meUserId, mePersonId, presence, syncing, connection, refresh,
      createPerson, updatePerson, deletePerson, claimPerson,
      createUnion, updateUnion, deleteUnion, createLink, deleteLink, updateTree,
    ],
  );

  return <TreeContext.Provider value={store}>{children}</TreeContext.Provider>;
}

/** Convenience for components that only need one person. */
export function usePerson(personId: string | null): Person | null {
  const { index } = useTree();
  return personId ? (index.personById.get(personId) ?? null) : null;
}

export function usePersonName(personId: string | null): string {
  const person = usePerson(personId);
  return person ? displayName(person) : '';
}
