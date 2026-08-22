'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  Crown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Ticket,
  TreeDeciduous,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/empty-state';
import { api, messageFor } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/domain/dates';
import type { Role, Tree, TreeSummary } from '@/lib/domain/types';

const ROLE_BADGE: Record<Role, { icon: typeof Crown; label: string; variant: 'ochre' | 'sage' | 'muted' }> = {
  CREATOR: { icon: Crown, label: 'Creator', variant: 'ochre' },
  ADMIN: { icon: Shield, label: 'Admin', variant: 'ochre' },
  EDITOR: { icon: Pencil, label: 'Editor', variant: 'sage' },
  VIEWER: { icon: Eye, label: 'Viewer', variant: 'muted' },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TreeHome({ trees, firstName }: { trees: TreeSummary[]; firstName: string | null }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const heading = useMemo(
    () => (firstName ? `${greeting()}, ${firstName}.` : `${greeting()}.`),
    [firstName],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            {trees.length === 0
              ? 'Nothing here yet — that changes with one name.'
              : `${trees.length} ${trees.length === 1 ? 'tree' : 'trees'} you can open.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <JoinDialog open={joinOpen} onOpenChange={setJoinOpen} />
          <CreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(tree) => router.push(`/tree/${tree.id}`)}
          />
        </div>
      </div>

      {trees.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/40">
          <EmptyState
            icon={<TreeDeciduous className="size-6" />}
            title="Start with one name"
            description="Yours, usually. Add your parents next, then theirs — and invite the relative most likely to correct you."
            action={
              <Button size="lg" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create your first tree
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {trees.map((tree) => (
            <TreeCard key={tree.id} tree={tree} />
          ))}

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/30 text-muted-foreground transition-colors hover:border-ochre/50 hover:bg-card/60 hover:text-foreground"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-border bg-card transition-colors group-hover:border-ochre/40 group-hover:text-ochre">
              <Plus className="size-5" />
            </span>
            <span className="text-sm font-medium">New tree</span>
          </button>
        </div>
      )}
    </main>
  );
}

function TreeCard({ tree }: { tree: TreeSummary }) {
  const badge = ROLE_BADGE[tree.role];

  return (
    <Link
      href={`/tree/${tree.id}`}
      className="card-lift group flex min-h-[11rem] flex-col rounded-2xl border border-border bg-card p-6 hover:border-ochre/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg leading-snug font-semibold tracking-tight">
          {tree.name}
        </h2>
        <Badge variant={badge.variant} className="shrink-0 gap-1">
          <badge.icon className="size-3" />
          {badge.label}
        </Badge>
      </div>

      {tree.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {tree.description}
        </p>
      )}

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <TreeDeciduous className="size-3.5" />
            {tree.personCount} {tree.personCount === 1 ? 'person' : 'people'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {tree.memberCount}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {tree.lastActivityAt
              ? `Updated ${formatRelativeTime(tree.lastActivityAt)}`
              : 'No changes yet'}
          </span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ochre" />
        </div>
      </div>
    </Link>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tree: Tree) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const tree = await api<Tree>('/api/trees', {
        method: 'POST',
        body: { name: name.trim(), description: description.trim() || null },
      });
      toast.success(`${tree.name} is ready.`);
      onCreated(tree);
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 sm:w-auto">
          <Plus className="size-4" />
          New tree
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Name your tree</DialogTitle>
            <DialogDescription>
              Most people use a surname, or the couple everything descends from. You can change it
              later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="tree-name">Name</Label>
              <Input
                id="tree-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="The Rathi Family"
                maxLength={80}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tree-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="tree-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descendants of Ramesh and Sunita, who moved from Jaipur to Delhi in 1961."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create tree
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned) router.push(`/join/${encodeURIComponent(cleaned)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <Ticket className="size-4" />
          Use an invite
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Enter your invite code</DialogTitle>
            <DialogDescription>
              Whoever invited you can send the full link instead — it opens straight to the tree.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Label htmlFor="invite-code" className="sr-only">
              Invite code
            </Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="text-center font-mono text-lg tracking-[0.2em]"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!code.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
