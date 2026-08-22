'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Crown,
  Eye,
  History,
  Link2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserMinus,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import { useTree } from '@/lib/hooks/use-tree';
import { api, messageFor } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/domain/dates';
import { describeEvent } from '@/lib/domain/activity';
import { ROLE_LABELS } from '@/lib/domain/permissions';
import { cn } from '@/lib/utils';
import type { ActivityEvent, Invite, Member, Role } from '@/lib/domain/types';
import { InviteComposer } from './invite-composer';

const ROLE_ICON: Record<Role, typeof Eye> = {
  CREATOR: Crown,
  ADMIN: Shield,
  EDITOR: Pencil,
  VIEWER: Eye,
};

const ROLE_TONE: Record<Role, 'ochre' | 'sage' | 'muted'> = {
  CREATOR: 'ochre',
  ADMIN: 'ochre',
  EDITOR: 'sage',
  VIEWER: 'muted',
};

export function MembersPanel({
  open,
  onOpenChange,
  onSelectPerson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPerson: (personId: string) => void;
}) {
  const { tree, role, canManage, meUserId } = useTree();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await api<Member[]>(`/api/trees/${tree.id}/members`));
    } catch (error) {
      toast.error(messageFor(error));
    }
  }, [tree.id]);

  const loadInvites = useCallback(async () => {
    if (!canManage) return;
    try {
      setInvites(await api<Invite[]>(`/api/trees/${tree.id}/invites`));
    } catch (error) {
      toast.error(messageFor(error));
    }
  }, [tree.id, canManage]);

  const loadEvents = useCallback(async () => {
    try {
      const result = await api<{ events: ActivityEvent[] }>(`/api/trees/${tree.id}/events?take=50`);
      setEvents(result.events);
    } catch (error) {
      toast.error(messageFor(error));
    }
  }, [tree.id]);

  useEffect(() => {
    if (!open) return;
    void loadMembers();
    void loadInvites();
    void loadEvents();
  }, [open, loadMembers, loadInvites, loadEvents]);

  const changeRole = async (userId: string, nextRole: Role) => {
    try {
      await api(`/api/trees/${tree.id}/members/${userId}`, {
        method: 'PATCH',
        body: { role: nextRole },
      });
      setMembers((current) =>
        current?.map((member) => (member.userId === userId ? { ...member, role: nextRole } : member)) ?? null,
      );
      toast.success(`Now ${ROLE_LABELS[nextRole].label.toLowerCase()}.`);
      void loadEvents();
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const removeMember = async (member: Member) => {
    try {
      await api(`/api/trees/${tree.id}/members/${member.userId}`, { method: 'DELETE' });
      setMembers((current) => current?.filter((entry) => entry.userId !== member.userId) ?? null);
      toast.success(`${member.user.name ?? 'That member'} no longer has access.`);
      void loadEvents();
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 pr-12 sm:px-5">
          <SheetTitle className="font-display text-lg">Who&apos;s in this tree</SheetTitle>
          <SheetDescription>
            {ROLE_LABELS[role].label} access — {ROLE_LABELS[role].description.toLowerCase()}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="members" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-4 mt-4 grid w-auto grid-cols-3 sm:mx-5">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invites" disabled={!canManage}>
              Invites
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {members === null ? (
              <Loading />
            ) : (
              <ul className="space-y-1">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isMe={member.userId === meUserId}
                    canManage={canManage}
                    myRole={role}
                    onChangeRole={changeRole}
                    onRemove={removeMember}
                    onSelectPerson={(personId) => {
                      onOpenChange(false);
                      onSelectPerson(personId);
                    }}
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="invites" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <InvitesTab
              treeId={tree.id}
              invites={invites}
              onChanged={() => {
                void loadInvites();
                void loadEvents();
              }}
            />
          </TabsContent>

          <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {events === null ? (
              <Loading />
            ) : events.length === 0 ? (
              <EmptyState
                icon={<History className="size-5" />}
                title="Nothing has happened yet"
                description="Every change anyone makes will be listed here, with their name against it."
              />
            ) : (
              <ol className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ochre/60" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{describeEvent(event)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function MemberRow({
  member,
  isMe,
  canManage,
  myRole,
  onChangeRole,
  onRemove,
  onSelectPerson,
}: {
  member: Member;
  isMe: boolean;
  canManage: boolean;
  myRole: Role;
  onChangeRole: (userId: string, role: Role) => void;
  onRemove: (member: Member) => void;
  onSelectPerson: (personId: string) => void;
}) {
  const Icon = ROLE_ICON[member.role];
  // Admins manage editors and viewers; only the creator touches another admin.
  const manageable =
    canManage &&
    !isMe &&
    member.role !== 'CREATOR' &&
    (member.role !== 'ADMIN' || myRole === 'CREATOR');

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50">
      <div className="relative">
        {member.user.image ? (
          <Image
            src={member.user.image}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="size-9 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <span className="font-display grid size-9 place-items-center rounded-full bg-secondary text-sm text-secondary-foreground">
            {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
          </span>
        )}
        {member.online && (
          <span
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-sage ring-2 ring-card"
            aria-label="Here now"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.user.name ?? member.user.email}
          {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant={ROLE_TONE[member.role]} className="gap-1 px-1.5 py-0 text-[10px]">
            <Icon className="size-2.5" />
            {ROLE_LABELS[member.role].label}
          </Badge>
          {member.personId && (
            <button
              type="button"
              onClick={() => onSelectPerson(member.personId!)}
              className="text-[11px] text-muted-foreground hover:text-ochre hover:underline"
            >
              in the tree
            </button>
          )}
        </div>
      </div>

      {manageable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Manage ${member.user.name ?? 'member'}`}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Change access</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['ADMIN', 'EDITOR', 'VIEWER'] as Role[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => onChangeRole(member.userId, option)}
                disabled={member.role === option}
              >
                {member.role === option ? (
                  <Check className="size-4" />
                ) : (
                  <span className="size-4" />
                )}
                <div>
                  <p className="text-sm">{ROLE_LABELS[option].label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ROLE_LABELS[option].description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemove(member)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <UserMinus className="size-4" />
              Remove from tree
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function InvitesTab({
  treeId,
  invites,
  onChanged,
}: {
  treeId: string;
  invites: Invite[] | null;
  onChanged: () => void;
}) {
  const [composing, setComposing] = useState(false);

  if (invites === null) return <Loading />;

  const active = invites.filter((invite) => invite.status === 'ACTIVE');
  const past = invites.filter((invite) => invite.status !== 'ACTIVE');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-sunken/50 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          An invite link is the only way into this tree. Give it a role, an expiry and a use limit —
          and revoke it the moment it has done its job.
        </p>
      </div>

      {composing ? (
        <InviteComposer
          treeId={treeId}
          onDone={() => {
            setComposing(false);
            onChanged();
          }}
          onCancel={() => setComposing(false)}
        />
      ) : (
        <Button onClick={() => setComposing(true)} className="w-full gap-2">
          <Plus className="size-4" />
          Create an invite link
        </Button>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Active
          </h3>
          <ul className="space-y-2">
            {active.map((invite) => (
              <InviteRow key={invite.id} treeId={treeId} invite={invite} onChanged={onChanged} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            No longer valid
          </h3>
          <ul className="space-y-2 opacity-60">
            {past.map((invite) => (
              <InviteRow key={invite.id} treeId={treeId} invite={invite} onChanged={onChanged} />
            ))}
          </ul>
        </section>
      )}

      {invites.length === 0 && !composing && (
        <EmptyState
          icon={<Link2 className="size-5" />}
          title="No invites yet"
          description="Create one and send it to the relative most likely to know the missing dates."
        />
      )}
    </div>
  );
}

function InviteRow({
  treeId,
  invite,
  onChanged,
}: {
  treeId: string;
  invite: Invite;
  onChanged: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = invite.status === 'ACTIVE';

  const copy = async () => {
    const url = `${window.location.origin}/join/${invite.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied.');
    setTimeout(() => setCopied(false), 2200);
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await api(`/api/trees/${treeId}/invites/${invite.id}`, { method: 'DELETE' });
      toast.success('Invite revoked — that link no longer works.');
      onChanged();
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <code className="font-mono text-sm tracking-wider">{invite.code}</code>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ROLE_LABELS[invite.role].label}
            {invite.note ? ` · ${invite.note}` : ''}
          </p>
        </div>
        <Badge variant={active ? 'sage' : 'muted'} className="shrink-0">
          {invite.status.toLowerCase()}
        </Badge>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          Used {invite.useCount}
          {invite.maxUses ? ` of ${invite.maxUses}` : ''}
        </span>
        {invite.expiresAt && <span>Expires {formatRelativeTime(invite.expiresAt)}</span>}
      </div>

      {active && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={copy} className="flex-1 gap-1.5">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={revoke}
            disabled={busy}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Revoke
          </Button>
        </div>
      )}
    </li>
  );
}

function Loading() {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground')}>
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  );
}
