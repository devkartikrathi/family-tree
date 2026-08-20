'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTree } from '@/lib/hooks/use-tree';
import { messageFor } from '@/lib/api-client';
import { displayName } from '@/lib/domain/graph';
import { isValidPartialDate } from '@/lib/domain/dates';
import type { UnionKind, UnionStatus } from '@/lib/domain/types';
import { PartialDateInput } from './partial-date-input';
import { PlaceInput, type PlaceValue } from './place-input';

const KINDS: { value: UnionKind; label: string }[] = [
  { value: 'MARRIAGE', label: 'Marriage' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'OTHER', label: 'Other' },
];

const STATUSES: { value: UnionStatus; label: string }[] = [
  { value: 'CURRENT', label: 'Together' },
  { value: 'SEPARATED', label: 'Separated' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'UNKNOWN', label: 'Not recorded' },
];

export function UnionEditorDialog({
  unionId,
  onClose,
}: {
  unionId: string;
  onClose: () => void;
}) {
  const { index, updateUnion, deleteUnion, canEdit } = useTree();
  const union = index.unionById.get(unionId);

  const [kind, setKind] = useState<UnionKind>(union?.kind ?? 'MARRIAGE');
  const [status, setStatus] = useState<UnionStatus>(union?.status ?? 'CURRENT');
  const [startDate, setStartDate] = useState(union?.startDate ?? '');
  const [endDate, setEndDate] = useState(union?.endDate ?? '');
  const [place, setPlace] = useState<PlaceValue>({
    place: union?.place ?? '',
    lat: null,
    lng: null,
  });
  const [note, setNote] = useState(union?.note ?? '');
  const [busy, setBusy] = useState(false);

  if (!union) return null;

  const names = union.partnerIds
    .map((id) => index.personById.get(id))
    .filter(Boolean)
    .map((person) => displayName(person!));

  const ended = status === 'DIVORCED' || status === 'SEPARATED' || status === 'WIDOWED';

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidPartialDate(startDate) || !isValidPartialDate(endDate)) {
      toast.error('Check the dates — use a year, a year and month, or a full date.');
      return;
    }

    setBusy(true);
    try {
      await updateUnion(unionId, {
        kind,
        status,
        startDate: startDate.trim() || null,
        endDate: ended ? endDate.trim() || null : null,
        place: place.place.trim() || null,
        note: note.trim() || null,
      });
      toast.success('Saved.');
      onClose();
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteUnion(unionId);
      toast.success('Marriage removed. Any children keep both parents.');
      onClose();
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{names.join(' & ')}</DialogTitle>
            <DialogDescription>
              Recording when and where a marriage began — and whether it ended — is what lets the
              timeline and the map tell the whole story.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="union-kind">Kind</Label>
                <Select value={kind} onValueChange={(value) => setKind(value as UnionKind)}>
                  <SelectTrigger id="union-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="union-status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as UnionStatus)}>
                  <SelectTrigger id="union-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="union-start">Began</Label>
                <PartialDateInput id="union-start" value={startDate} onChange={setStartDate} />
              </div>

              {ended && (
                <div className="space-y-1.5">
                  <Label htmlFor="union-end">Ended</Label>
                  <PartialDateInput id="union-end" value={endDate} onChange={setEndDate} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="union-place">Where</Label>
              <PlaceInput id="union-place" value={place} onChange={setPlace} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="union-note">Note</Label>
              <Textarea
                id="union-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="They met on the train to Jaipur…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={busy}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Unlink className="size-3.5" />
                Remove this marriage
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !canEdit} className="gap-2">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
