'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonAvatar } from '@/components/person-avatar';
import { ApiClientError } from '@/lib/api-client';
import type { Person } from '@/lib/domain/types';

/**
 * Uploads go to Vercel Blob when it is configured. When it isn't, the control
 * quietly turns into a URL field rather than showing a broken button — the
 * photograph matters more than how it got here.
 */
export function PhotoInput({
  value,
  onChange,
  person,
}: {
  value: string;
  onChange: (url: string) => void;
  person: Pick<Person, 'givenName' | 'familyName' | 'isLiving'>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlMode, setUrlMode] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = await response.json();

      if (!response.ok) {
        throw new ApiClientError(
          response.status,
          payload?.error?.code ?? 'unknown',
          payload?.error?.message ?? 'That upload failed.',
        );
      }
      onChange(payload.url);
      toast.success('Photograph added.');
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'uploads_unconfigured') {
        setUrlMode(true);
        toast.info(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : 'That upload failed.');
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar person={{ ...person, photoUrl: value || null }} size="xl" dimDeceased={false} />

      <div className="min-w-0 flex-1 space-y-2">
        {urlMode ? (
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://…"
              className="text-sm"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setUrlMode(false)}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="gap-1.5"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {value ? 'Replace photo' : 'Add a photo'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUrlMode(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <Link2 className="size-3.5" />
              Use a link
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                className="text-muted-foreground"
              >
                Remove
              </Button>
            )}
          </div>
        )}

        <p className="text-[0.7rem] text-muted-foreground">
          JPEG, PNG, WebP or AVIF, up to 6 MB.
        </p>
      </div>
    </div>
  );
}
