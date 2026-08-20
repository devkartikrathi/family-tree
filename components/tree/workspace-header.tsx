'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarRange,
  Check,
  Loader2,
  Map,
  Network,
  Pencil,
  Plus,
  Search,
  Settings,
  Table2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogoMark } from '@/components/brand/logo';
import { useTree } from '@/lib/hooks/use-tree';
import { messageFor } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PresenceUser } from '@/lib/domain/types';

export type ViewKey = 'tree' | 'map' | 'timeline' | 'people';

const VIEWS: { key: ViewKey; label: string; icon: typeof Network }[] = [
  { key: 'tree', label: 'Tree', icon: Network },
  { key: 'map', label: 'Map', icon: Map },
  { key: 'timeline', label: 'Timeline', icon: CalendarRange },
  { key: 'people', label: 'People', icon: Table2 },
];

interface WorkspaceHeaderProps {
  view: ViewKey;
  onViewChange: (view: ViewKey) => void;
  onOpenSearch: () => void;
  onOpenMembers: () => void;
  onAddPerson: () => void;
}

export function WorkspaceHeader({
  view,
  onViewChange,
  onOpenSearch,
  onOpenMembers,
  onAddPerson,
}: WorkspaceHeaderProps) {
  const { tree, canEdit, canManage, presence, connection, persons } = useTree();

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/tree" aria-label="All your trees">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>All your trees</TooltipContent>
      </Tooltip>

      <LogoMark className="hidden size-5 shrink-0 text-ochre sm:block" />

      <TreeName />

      <ViewSwitcher view={view} onViewChange={onViewChange} />

      <div className="ml-auto flex items-center gap-1.5">
        <ConnectionDot connection={connection} />
        <PresenceStack presence={presence} onClick={onOpenMembers} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenSearch} aria-label="Search people">
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Search <kbd className="ml-1 font-mono text-[10px] opacity-70">⌘K</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenMembers} aria-label="Members">
              <Users className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Members &amp; invites</TooltipContent>
        </Tooltip>

        {canManage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon">
                <Link href={`/tree/${tree.id}/settings`} aria-label="Tree settings">
                  <Settings className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        )}

        {canEdit && (
          <Button onClick={onAddPerson} size="sm" className="ml-1 gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">{persons.length === 0 ? 'Add the first person' : 'Add person'}</span>
          </Button>
        )}

        <div className="ml-1.5">
          <UserButton appearance={{ elements: { avatarBox: 'size-7 ring-1 ring-border' } }} />
        </div>
      </div>
    </header>
  );
}

function TreeName() {
  const { tree, canManage, updateTree } = useTree();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tree.name);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tree.name) {
      setName(tree.name);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await updateTree({ name: trimmed });
      toast.success('Renamed.');
      setEditing(false);
    } catch (error) {
      toast.error(messageFor(error));
      setName(tree.name);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save();
            if (event.key === 'Escape') {
              setName(tree.name);
              setEditing(false);
            }
          }}
          autoFocus
          className="font-display h-8 w-52 text-sm font-semibold"
          maxLength={80}
        />
        <Button size="icon-sm" variant="ghost" onClick={save} disabled={busy} aria-label="Save name">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => canManage && setEditing(true)}
      disabled={!canManage}
      className={cn(
        'group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left',
        canManage && 'hover:bg-muted',
      )}
      title={canManage ? 'Rename this tree' : tree.name}
    >
      <span className="font-display truncate text-sm font-semibold tracking-tight">{tree.name}</span>
      {canManage && (
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function ViewSwitcher({ view, onViewChange }: { view: ViewKey; onViewChange: (view: ViewKey) => void }) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="ml-2 hidden items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.5 md:flex"
    >
      {VIEWS.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={view === item.key}
          onClick={() => onViewChange(item.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            view === item.key
              ? 'bg-secondary text-foreground shadow-[var(--shadow-paper)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MobileViewBar({
  view,
  onViewChange,
}: {
  view: ViewKey;
  onViewChange: (view: ViewKey) => void;
}) {
  return (
    <nav className="z-30 flex shrink-0 items-center justify-around border-t border-border/70 bg-background/95 px-2 py-1.5 backdrop-blur-xl md:hidden">
      {VIEWS.map((item) => (
        <button
          key={item.key}
          onClick={() => onViewChange(item.key)}
          aria-current={view === item.key}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
            view === item.key ? 'text-ochre' : 'text-muted-foreground',
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function ConnectionDot({ connection }: { connection: 'live' | 'connecting' | 'offline' }) {
  const label =
    connection === 'live'
      ? 'Live — changes from other members appear as they happen'
      : connection === 'connecting'
        ? 'Connecting to the live feed…'
        : 'Not connected. Your changes still save; you just won’t see others’ live.';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden size-8 place-items-center sm:grid" aria-label={label}>
          {connection === 'offline' ? (
            <WifiOff className="size-3.5 text-muted-foreground" />
          ) : (
            <Wifi
              className={cn(
                'size-3.5',
                connection === 'live' ? 'text-sage' : 'animate-pulse text-muted-foreground',
              )}
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{label}</TooltipContent>
    </Tooltip>
  );
}

function PresenceStack({
  presence,
  onClick,
}: {
  presence: PresenceUser[];
  onClick: () => void;
}) {
  if (presence.length === 0) return null;
  const shown = presence.slice(0, 3);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="mr-1 hidden -space-x-2 sm:flex"
          aria-label={`${presence.length} here now`}
        >
          {shown.map((user) =>
            user.image ? (
              <Image
                key={user.userId}
                src={user.image}
                alt=""
                width={24}
                height={24}
                unoptimized
                className="size-6 rounded-full object-cover ring-2 ring-background"
              />
            ) : (
              <span
                key={user.userId}
                className="font-display grid size-6 place-items-center rounded-full bg-sage-soft text-[10px] text-sage ring-2 ring-background"
              >
                {(user.name ?? '?').charAt(0).toUpperCase()}
              </span>
            ),
          )}
          {presence.length > shown.length && (
            <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
              +{presence.length - shown.length}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {presence.map((user) => user.name ?? 'A member').join(', ')} here now
      </TooltipContent>
    </Tooltip>
  );
}
