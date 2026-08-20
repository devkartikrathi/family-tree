'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  FileUp,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTree } from '@/lib/hooks/use-tree';
import { api, messageFor } from '@/lib/api-client';
import { treeStats } from '@/lib/domain/graph';
import { can } from '@/lib/domain/permissions';
import { cn } from '@/lib/utils';

const ACCENTS = [
  { value: 'ochre', label: 'Ochre', swatch: 'var(--ochre)' },
  { value: 'sage', label: 'Sage', swatch: 'var(--sage)' },
  { value: 'clay', label: 'Clay', swatch: 'var(--clay)' },
  { value: 'indigo', label: 'Indigo', swatch: 'var(--indigo)' },
  { value: 'plum', label: 'Plum', swatch: 'var(--plum)' },
] as const;

export function TreeSettings() {
  const { tree, role, index, layout, updateTree, refresh } = useTree();
  const router = useRouter();
  const stats = treeStats(index, layout.generationCount);

  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(tree.description ?? '');
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== tree.name || (description.trim() || '') !== (tree.description ?? '');

  const saveDetails = async () => {
    setSaving(true);
    try {
      await updateTree({ name: name.trim(), description: description.trim() || null });
      toast.success('Saved.');
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setSaving(false);
    }
  };

  const setProtectLiving = async (value: boolean) => {
    try {
      await updateTree({ protectLiving: value });
      await refresh();
      toast.success(
        value
          ? 'Protected. Viewers no longer see the private details of living people.'
          : 'Protection off. Every member sees the full record.',
      );
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href={`/tree/${tree.id}`}>
            <ArrowLeft className="size-3.5" />
            Back to the tree
          </Link>
        </Button>

        <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-muted-foreground">
          {stats.people} {stats.people === 1 ? 'person' : 'people'} · {stats.generations}{' '}
          {stats.generations === 1 ? 'generation' : 'generations'} · {stats.unions}{' '}
          {stats.unions === 1 ? 'marriage' : 'marriages'}
        </p>

        <div className="mt-10 space-y-8">
          <Section title="Details" description="How this tree is named and described.">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Descendants of Ramesh and Sunita, who moved from Jaipur to Delhi in 1961."
              />
            </div>

            <div className="space-y-2">
              <Label>Accent</Label>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.value}
                    type="button"
                    onClick={() => updateTree({ accent: accent.value }).catch((error) => toast.error(messageFor(error)))}
                    aria-pressed={tree.accent === accent.value}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                      tree.accent === accent.value
                        ? 'border-foreground/30 bg-muted'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="size-3 rounded-full" style={{ background: accent.swatch }} />
                    {accent.label}
                  </button>
                ))}
              </div>
            </div>

            {dirty && (
              <Button onClick={saveDetails} disabled={saving || !name.trim()} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            )}
          </Section>

          <Section
            title="Privacy"
            description="Family trees hold details about people who never signed up for one."
          >
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage" />
                <div>
                  <Label htmlFor="protect-living" className="text-sm">
                    Protect living people
                  </Label>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Viewers see who exists and how everyone connects, but not the dates, places,
                    occupations or stories of anyone still living. Editors and admins always see the
                    whole record. Enforced on the server.
                  </p>
                </div>
              </div>
              <Switch
                id="protect-living"
                checked={tree.protectLiving}
                onCheckedChange={setProtectLiving}
              />
            </div>
          </Section>

          <Section
            title="Your data"
            description="Take the whole tree with you, or bring one in from elsewhere."
          >
            <ExportRow treeId={tree.id} />
            {can.manageSettings(role) && <ImportRow treeId={tree.id} onDone={refresh} />}
          </Section>

          <Section title="Leaving" description="">
            {role === 'CREATOR' ? (
              <DangerZone treeName={tree.name} treeId={tree.id} />
            ) : (
              <LeaveTree treeId={tree.id} onLeft={() => router.push('/tree')} />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-8 first:border-0 first:pt-0">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ExportRow({ treeId }: { treeId: string }) {
  const formats = [
    { key: 'gedcom', label: 'GEDCOM', hint: 'Ancestry, MyHeritage, Gramps' },
    { key: 'json', label: 'JSON', hint: 'A faithful backup' },
    { key: 'csv', label: 'CSV', hint: 'A spreadsheet' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {formats.map((format) => (
        <a
          key={format.key}
          href={`/api/trees/${treeId}/export?format=${format.key}`}
          className="card-lift flex flex-col gap-1 rounded-xl border border-border p-4 hover:border-ochre/40"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Download className="size-3.5 text-ochre" />
            {format.label}
          </span>
          <span className="text-xs text-muted-foreground">{format.hint}</span>
        </a>
      ))}
    </div>
  );
}

function ImportRow({ treeId, onDone }: { treeId: string; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const content = await file.text();
      const result = await api<{ persons: number; unions: number; links: number; warnings: string[] }>(
        `/api/trees/${treeId}/import`,
        { method: 'POST', body: { format: 'gedcom', content } },
      );
      onDone();
      toast.success(
        `Imported ${result.persons} people, ${result.unions} marriages and ${result.links} connections.`,
        { description: result.warnings[0] },
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <FileUp className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Import a GEDCOM file</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Everything in the file is added to this tree alongside what is already here. It lands in
            one transaction, so a malformed file changes nothing.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".ged,.gedcom,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
            Choose a .ged file
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeaveTree({ treeId, onLeft }: { treeId: string; onLeft: () => void }) {
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      await api(`/api/trees/${treeId}/leave`, { method: 'POST' });
      toast.success('You have left this tree.');
      onLeft();
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">Leave this tree</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You lose access immediately. An admin can invite you back.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={leave} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        Leave
      </Button>
    </div>
  );
}

function DangerZone({ treeId, treeName }: { treeId: string; treeName: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const destroy = async () => {
    setBusy(true);
    try {
      await api(`/api/trees/${treeId}`, { method: 'DELETE', body: { confirm } });
      toast.success(`${treeName} has been deleted.`);
      router.push('/tree');
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">Delete this tree</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Every person, relationship, invite and record of who changed what. Nobody keeps a copy.
            Export it first if there is any doubt.
          </p>

          {armed ? (
            <div className="mt-4 space-y-2">
              <Label htmlFor="confirm-delete" className="text-xs">
                Type <span className="font-medium text-foreground">{treeName}</span> to confirm
              </Label>
              <div className="flex gap-2">
                <Input
                  id="confirm-delete"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder={treeName}
                  autoFocus
                />
                <Button
                  variant="destructive"
                  onClick={destroy}
                  disabled={busy || confirm.trim() !== treeName.trim()}
                  className="gap-1.5"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Delete
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setArmed(true)}
            >
              <Trash2 className="size-3.5" />
              Delete tree
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
