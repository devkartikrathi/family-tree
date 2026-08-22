'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTree } from '@/lib/hooks/use-tree';
import { ApiClientError, messageFor } from '@/lib/api-client';
import { displayName } from '@/lib/domain/graph';
import { isValidPartialDate } from '@/lib/domain/dates';
import type { ParentKind, Person, Sex } from '@/lib/domain/types';
import type { RelativeKind } from '../canvas/canvas-context';
import { PartialDateInput } from './partial-date-input';
import { PlaceInput, type PlaceValue } from './place-input';
import { PhotoInput } from './photo-input';

export type EditorIntent =
  | { mode: 'create'; relateTo?: { personId: string; as: RelativeKind; unionId: string | null } }
  | { mode: 'edit'; personId: string };

interface FormState {
  givenName: string;
  familyName: string;
  nickname: string;
  maidenName: string;
  sex: Sex;
  isLiving: boolean;
  birthDate: string;
  birth: PlaceValue;
  deathDate: string;
  death: PlaceValue;
  residence: PlaceValue;
  occupation: string;
  bio: string;
  photoUrl: string;
}

const emptyPlace: PlaceValue = { place: '', lat: null, lng: null };

function toForm(person?: Person | null): FormState {
  return {
    givenName: person?.givenName ?? '',
    familyName: person?.familyName ?? '',
    nickname: person?.nickname ?? '',
    maidenName: person?.maidenName ?? '',
    sex: person?.sex ?? 'UNKNOWN',
    isLiving: person?.isLiving ?? true,
    birthDate: person?.birthDate ?? '',
    birth: { place: person?.birthPlace ?? '', lat: person?.birthLat ?? null, lng: person?.birthLng ?? null },
    deathDate: person?.deathDate ?? '',
    death: { place: person?.deathPlace ?? '', lat: person?.deathLat ?? null, lng: person?.deathLng ?? null },
    residence: {
      place: person?.residencePlace ?? '',
      lat: person?.residenceLat ?? null,
      lng: person?.residenceLng ?? null,
    },
    occupation: person?.occupation ?? '',
    bio: person?.bio ?? '',
    photoUrl: person?.photoUrl ?? '',
  };
}

const RELATION_WORD: Record<RelativeKind, string> = {
  parent: 'parent',
  child: 'child',
  partner: 'partner',
  sibling: 'sibling',
};

const PARENT_KINDS: { value: ParentKind; label: string }[] = [
  { value: 'BIOLOGICAL', label: 'Biological' },
  { value: 'ADOPTED', label: 'Adopted' },
  { value: 'STEP', label: 'Step' },
  { value: 'FOSTER', label: 'Foster' },
  { value: 'GUARDIAN', label: 'Guardian' },
];

export function PersonEditorDialog({
  intent,
  onClose,
  onSaved,
}: {
  intent: EditorIntent;
  onClose: () => void;
  onSaved: (personId: string) => void;
}) {
  const { index, createPerson, updatePerson, deletePerson } = useTree();

  const existing = intent.mode === 'edit' ? (index.personById.get(intent.personId) ?? null) : null;
  const anchor = intent.mode === 'create' && intent.relateTo
    ? (index.personById.get(intent.relateTo.personId) ?? null)
    : null;

  const [form, setForm] = useState<FormState>(() => {
    const base = toForm(existing);
    // A new relative almost always shares the surname of whoever you added
    // them from; pre-filling it saves a keystroke and can be cleared.
    if (!existing && anchor && intent.mode === 'create' && intent.relateTo?.as !== 'partner') {
      base.familyName = anchor.familyName ?? '';
    }
    return base;
  });

  const [parentKind, setParentKind] = useState<ParentKind>('BIOLOGICAL');
  const [unionId, setUnionId] = useState<string | null>(
    intent.mode === 'create' ? (intent.relateTo?.unionId ?? null) : null,
  );
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const anchorUnions = useMemo(
    () => (anchor ? (index.unionsOf.get(anchor.id) ?? []) : []),
    [anchor, index],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const title = existing
    ? `Edit ${displayName(existing)}`
    : anchor && intent.mode === 'create' && intent.relateTo
      ? `Add ${displayName(anchor)}'s ${RELATION_WORD[intent.relateTo.as]}`
      : 'Add a person';

  const datesValid = isValidPartialDate(form.birthDate) && isValidPartialDate(form.deathDate);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.givenName.trim()) {
      setFieldErrors({ givenName: 'A first name is required.' });
      return;
    }
    if (!datesValid) {
      toast.error('Check the dates — use a year, a year and month, or a full date.');
      return;
    }

    const payload = {
      givenName: form.givenName.trim(),
      familyName: form.familyName.trim() || null,
      nickname: form.nickname.trim() || null,
      maidenName: form.maidenName.trim() || null,
      sex: form.sex,
      isLiving: form.isLiving,
      birthDate: form.birthDate.trim() || null,
      birthPlace: form.birth.place.trim() || null,
      birthLat: form.birth.lat,
      birthLng: form.birth.lng,
      deathDate: form.isLiving ? null : form.deathDate.trim() || null,
      deathPlace: form.isLiving ? null : form.death.place.trim() || null,
      deathLat: form.isLiving ? null : form.death.lat,
      deathLng: form.isLiving ? null : form.death.lng,
      residencePlace: form.residence.place.trim() || null,
      residenceLat: form.residence.lat,
      residenceLng: form.residence.lng,
      occupation: form.occupation.trim() || null,
      bio: form.bio.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
    };

    setBusy(true);
    setFieldErrors({});

    try {
      if (intent.mode === 'edit') {
        await updatePerson(intent.personId, payload);
        toast.success('Saved.');
        onSaved(intent.personId);
        return;
      }

      const person = await createPerson({
        ...payload,
        relateTo: intent.relateTo
          ? {
              personId: intent.relateTo.personId,
              as: intent.relateTo.as,
              unionId: intent.relateTo.as === 'child' ? unionId : null,
              parentKind,
              unionKind: 'MARRIAGE',
            }
          : null,
      });

      toast.success(
        anchor && intent.relateTo
          ? `${displayName(person)} added as ${displayName(anchor)}'s ${RELATION_WORD[intent.relateTo.as]}.`
          : `${displayName(person)} added.`,
      );
      onSaved(person.id);
    } catch (error) {
      if (error instanceof ApiClientError && error.fields) setFieldErrors(error.fields);
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await deletePerson(existing.id);
      toast.success(`${displayName(existing)} removed.`);
      onClose();
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
          <DialogHeader className="border-b border-border px-4 py-4 pr-12 text-left sm:px-6 sm:py-5">
            <DialogTitle className="font-display text-xl">{title}</DialogTitle>
            <DialogDescription>
              Only a first name is required. Everything else can be filled in later, by you or by
              whoever remembers it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:space-y-7 sm:px-6 sm:py-6">
            {intent.mode === 'create' && anchor && intent.relateTo && (
              <RelationshipSection
                anchorName={displayName(anchor)}
                relation={intent.relateTo.as}
                unions={anchorUnions.map((union) => ({
                  id: union.id,
                  label: union.partnerIds
                    .filter((id) => id !== anchor.id)
                    .map((id) => {
                      const partner = index.personById.get(id);
                      return partner ? displayName(partner) : 'Unknown';
                    })
                    .join(' & '),
                }))}
                unionId={unionId}
                onUnionChange={setUnionId}
                parentKind={parentKind}
                onParentKindChange={setParentKind}
              />
            )}

            <Section title="Who they are">
              <PhotoInput
                value={form.photoUrl}
                onChange={(url) => set('photoUrl', url)}
                person={{
                  givenName: form.givenName || '?',
                  familyName: form.familyName || null,
                  isLiving: form.isLiving,
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="givenName" error={fieldErrors.givenName} required>
                  <Input
                    id="givenName"
                    value={form.givenName}
                    onChange={(event) => set('givenName', event.target.value)}
                    autoFocus
                    maxLength={80}
                    required
                  />
                </Field>

                <Field label="Family name" htmlFor="familyName" error={fieldErrors.familyName}>
                  <Input
                    id="familyName"
                    value={form.familyName}
                    onChange={(event) => set('familyName', event.target.value)}
                    maxLength={80}
                  />
                </Field>

                <Field label="Known as" htmlFor="nickname" hint="A nickname the family uses">
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(event) => set('nickname', event.target.value)}
                    maxLength={60}
                  />
                </Field>

                <Field label="Name at birth" htmlFor="maidenName" hint="If it changed on marriage">
                  <Input
                    id="maidenName"
                    value={form.maidenName}
                    onChange={(event) => set('maidenName', event.target.value)}
                    maxLength={80}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sex" htmlFor="sex" hint="Used only for wording relationships">
                  <Select value={form.sex} onValueChange={(value) => set('sex', value as Sex)}>
                    <SelectTrigger id="sex" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="UNKNOWN">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div>
                    <Label htmlFor="isLiving" className="text-sm">
                      Living
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {form.isLiving ? 'Still with us' : 'No longer living'}
                    </p>
                  </div>
                  <Switch
                    id="isLiving"
                    checked={form.isLiving}
                    onCheckedChange={(checked) => set('isLiving', checked)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Born">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date of birth" htmlFor="birthDate">
                  <PartialDateInput
                    id="birthDate"
                    value={form.birthDate}
                    onChange={(value) => set('birthDate', value)}
                  />
                </Field>
                <Field label="Place of birth" htmlFor="birthPlace">
                  <PlaceInput
                    id="birthPlace"
                    value={form.birth}
                    onChange={(value) => set('birth', value)}
                  />
                </Field>
              </div>
            </Section>

            {!form.isLiving && (
              <Section title="Died">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date of death" htmlFor="deathDate">
                    <PartialDateInput
                      id="deathDate"
                      value={form.deathDate}
                      onChange={(value) => set('deathDate', value)}
                    />
                  </Field>
                  <Field label="Place of death" htmlFor="deathPlace">
                    <PlaceInput
                      id="deathPlace"
                      value={form.death}
                      onChange={(value) => set('death', value)}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Life">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={form.isLiving ? 'Lives in' : 'Last lived in'}
                  htmlFor="residence"
                  hint="Where to place them on the map"
                >
                  <PlaceInput
                    id="residence"
                    value={form.residence}
                    onChange={(value) => set('residence', value)}
                  />
                </Field>
                <Field label="Occupation" htmlFor="occupation">
                  <Input
                    id="occupation"
                    value={form.occupation}
                    onChange={(event) => set('occupation', event.target.value)}
                    placeholder="Schoolteacher"
                    maxLength={120}
                  />
                </Field>
              </div>

              <Field
                label="Their story"
                htmlFor="bio"
                hint="The details worth keeping — how they met, what they were like, what they used to say"
              >
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(event) => set('bio', event.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Kept bees behind the house and wrote letters every Sunday…"
                />
              </Field>
            </Section>
          </div>

          <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-between sm:px-6 sm:py-4">
            {existing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={busy}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Remove from tree
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !form.givenName.trim()}
                className="flex-1 gap-2 sm:flex-none"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {existing ? 'Save changes' : 'Add to tree'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RelationshipSection({
  anchorName,
  relation,
  unions,
  unionId,
  onUnionChange,
  parentKind,
  onParentKindChange,
}: {
  anchorName: string;
  relation: RelativeKind;
  unions: { id: string; label: string }[];
  unionId: string | null;
  onUnionChange: (unionId: string | null) => void;
  parentKind: ParentKind;
  onParentKindChange: (kind: ParentKind) => void;
}) {
  const showUnionPicker = relation === 'child' && unions.length > 0;
  const showParentKind = relation === 'parent' || relation === 'child';

  if (!showUnionPicker && !showParentKind) return null;

  return (
    <div className="rounded-xl border border-ochre/25 bg-ochre-soft/40 p-4 sm:p-5">
      <p className="text-sm font-medium">
        This person will be recorded as {anchorName}&apos;s {RELATION_WORD[relation]}.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {showUnionPicker && (
          <Field
            label="Other parent"
            htmlFor="union"
            hint="Grouping children under a couple keeps siblings together"
          >
            <Select
              value={unionId ?? 'none'}
              onValueChange={(value) => onUnionChange(value === 'none' ? null : value)}
            >
              <SelectTrigger id="union" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Just {anchorName}</SelectItem>
                {unions.map((union) => (
                  <SelectItem key={union.id} value={union.id}>
                    With {union.label || 'their partner'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {showParentKind && (
          <Field label="Relationship" htmlFor="parentKind">
            <Select value={parentKind} onValueChange={(value) => onParentKindChange(value as ParentKind)}>
              <SelectTrigger id="parentKind" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARENT_KINDS.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-ochre">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[0.7rem] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
