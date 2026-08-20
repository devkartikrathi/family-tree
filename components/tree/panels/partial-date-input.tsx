'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { formatPartialDate, isValidPartialDate, parsePartialDate } from '@/lib/domain/dates';
import { cn } from '@/lib/utils';

/**
 * A date picker cannot express "sometime in 1948", which is most of what a
 * family actually remembers. This takes a year, a year and month, or a full
 * date, and echoes back what it understood so there is no ambiguity.
 */
export function PartialDateInput({
  id,
  value,
  onChange,
  placeholder = 'e.g. 1948, 1948-03, 1948-03-12',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const hintId = useId();
  const trimmed = value.trim();
  const valid = isValidPartialDate(trimmed);
  const parsed = parsePartialDate(trimmed);

  return (
    <div>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode="numeric"
        aria-invalid={!valid}
        aria-describedby={hintId}
        className={cn('font-mono text-sm', !valid && 'border-destructive')}
      />
      <p
        id={hintId}
        className={cn(
          'mt-1 min-h-4 text-[0.7rem]',
          valid ? 'text-muted-foreground' : 'text-destructive',
        )}
      >
        {!valid
          ? 'Use a year, a year and month, or a full date.'
          : parsed
            ? `Reads as ${formatPartialDate(trimmed)}${parsed.precision === 'year' ? ' — a year alone is fine' : ''}`
            : 'A year on its own is fine.'}
      </p>
    </div>
  );
}
