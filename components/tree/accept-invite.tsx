'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { ArrowRight, CircleAlert, Eye, Loader2, Pencil, Shield, TreeDeciduous, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, messageFor } from '@/lib/api-client';
import { ROLE_LABELS } from '@/lib/domain/permissions';
import type { Role } from '@/lib/domain/types';

const ROLE_ICON: Record<Role, typeof Eye> = {
  CREATOR: Shield,
  ADMIN: Shield,
  EDITOR: Pencil,
  VIEWER: Eye,
};

interface AcceptInviteProps {
  code: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED';
  reason: string | null;
  role: Role;
  note: string | null;
  tree: {
    id: string;
    name: string;
    description: string | null;
    personCount: number;
    memberCount: number;
  };
  invitedBy: { name: string | null; image: string | null } | null;
  alreadyMember: boolean;
}

export function AcceptInvite({
  code,
  status,
  reason,
  role,
  note,
  tree,
  invitedBy,
  alreadyMember,
}: AcceptInviteProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const RoleIcon = ROLE_ICON[role];

  const accept = async () => {
    setBusy(true);
    try {
      await api(`/api/invites/${encodeURIComponent(code)}`, { method: 'POST' });
      toast.success(`Welcome to ${tree.name}.`);
      router.push(`/tree/${tree.id}`);
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-float)] sm:p-8">
        {invitedBy && (
          <div className="flex items-center gap-3 border-b border-border pb-6">
            {invitedBy.image ? (
              <Image
                src={invitedBy.image}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-ochre-soft font-display text-ochre">
                {(invitedBy.name ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{invitedBy.name ?? 'Someone'}</span>{' '}
              invited you to
            </p>
          </div>
        )}

        <div className="pt-6">
          <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {tree.name}
          </h1>
          {tree.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tree.description}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <TreeDeciduous className="size-4" />
              {tree.personCount} {tree.personCount === 1 ? 'person' : 'people'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" />
              {tree.memberCount} {tree.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          {note && (
            <p className="mt-5 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground italic">
              “{note}”
            </p>
          )}

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface-sunken/60 p-4">
            <RoleIcon className="mt-0.5 size-4 shrink-0 text-sage" />
            <div>
              <p className="text-sm font-medium">
                You&apos;ll join as{' '}
                <Badge variant="sage" className="ml-0.5 align-middle">
                  {ROLE_LABELS[role].label}
                </Badge>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABELS[role].description}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {alreadyMember ? (
            <Button asChild size="lg" className="w-full gap-2">
              <a href={`/tree/${tree.id}`}>
                You&apos;re already a member — open it
                <ArrowRight className="size-4" />
              </a>
            </Button>
          ) : status === 'ACTIVE' ? (
            <Button size="lg" className="w-full gap-2" onClick={accept} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Join this family
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">This invite can&apos;t be used</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reason} Ask whoever sent it for a fresh link.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        Joining lets the other members see your name and profile picture, and lets you see everything
        this tree holds — subject to your role.
      </p>
    </div>
  );
}
