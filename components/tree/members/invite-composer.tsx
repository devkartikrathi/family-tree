'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, messageFor } from '@/lib/api-client';
import { ROLE_LABELS } from '@/lib/domain/permissions';
import type { Invite, Role } from '@/lib/domain/types';

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'never', label: 'No expiry' },
];

const USE_OPTIONS = [
  { value: '1', label: 'Once — one person' },
  { value: '5', label: 'Up to 5 people' },
  { value: '25', label: 'Up to 25 people' },
  { value: 'unlimited', label: 'No limit' },
];

export function InviteComposer({
  treeId,
  onDone,
  onCancel,
}: {
  treeId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState<Role>('VIEWER');
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('30');
  const [uses, setUses] = useState('1');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const invite = await api<Invite>(`/api/trees/${treeId}/invites`, {
        method: 'POST',
        body: {
          role,
          note: note.trim() || null,
          maxUses: uses === 'unlimited' ? null : Number(uses),
          expiresInDays: expiry === 'never' ? null : Number(expiry),
        },
      });
      setCreated(invite);
      // Copy immediately — the next thing anyone does is paste it somewhere.
      await navigator.clipboard.writeText(`${window.location.origin}/join/${invite.code}`);
      setCopied(true);
      toast.success('Invite created and copied to your clipboard.');
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const url = `${window.location.origin}/join/${created.code}`;
    return (
      <div className="space-y-3 rounded-xl border border-sage/30 bg-sage-soft/40 p-4">
        <p className="text-sm font-medium">Your invite is ready</p>
        <div className="flex gap-2">
          <Input readOnly value={url} className="bg-card font-mono text-xs" />
          <Button
            size="icon"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            }}
            aria-label="Copy invite link"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Anyone with this link can join as {ROLE_LABELS[created.role].label.toLowerCase()}. Revoke it
          from the list below once it has been used.
        </p>
        <Button size="sm" onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={create} className="space-y-4 rounded-xl border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="invite-role">They join as</Label>
        <Select value={role} onValueChange={(value) => setRole(value as Role)}>
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['VIEWER', 'EDITOR', 'ADMIN'] as Role[]).map((option) => (
              <SelectItem key={option} value={option}>
                {ROLE_LABELS[option].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[0.7rem] text-muted-foreground">{ROLE_LABELS[role].description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invite-expiry">Expires</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger id="invite-expiry" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-uses">Can be used</Label>
          <Select value={uses} onValueChange={setUses}>
            <SelectTrigger id="invite-uses" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-note">
          Label <span className="text-muted-foreground">(only you see this)</span>
        </Label>
        <Input
          id="invite-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="For Aunt Deepa"
          maxLength={120}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="flex-1 gap-2">
          {busy && <Loader2 className="size-4 animate-spin" />}
          Create link
        </Button>
      </div>
    </form>
  );
}
