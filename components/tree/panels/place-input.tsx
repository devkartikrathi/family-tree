'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PlaceSuggestion } from '@/app/api/geocode/route';

export interface PlaceValue {
  place: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Nobody should ever type a latitude. This looks up real places through
 * OpenStreetMap and quietly attaches coordinates so the map has something to
 * plot — while still accepting "the village near Sirsa" as plain text, because
 * that is often all anyone remembers.
 */
export function PlaceInput({
  value,
  onChange,
  placeholder = 'Town, region, country',
  id,
}: {
  value: PlaceValue;
  onChange: (value: PlaceValue) => void;
  placeholder?: string;
  id?: string;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextLookup = useRef(false);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    const query = value.place.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api<{ results: PlaceSuggestion[] }>(
          `/api/geocode?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        setSuggestions(result.results);
        setOpen(result.results.length > 0);
        setHighlight(-1);
      } catch {
        // A failed lookup is not an error worth interrupting anyone for —
        // the field still accepts whatever they typed.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value.place]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const choose = (suggestion: PlaceSuggestion) => {
    skipNextLookup.current = true;
    onChange({ place: suggestion.label, lat: suggestion.lat, lng: suggestion.lng });
    setOpen(false);
    setSuggestions([]);
  };

  const pinned = value.lat !== null && value.lng !== null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value.place}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onChange={(event) => onChange({ place: event.target.value, lat: null, lng: null })}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlight((current) => Math.min(current + 1, suggestions.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlight((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && highlight >= 0) {
              event.preventDefault();
              choose(suggestions[highlight]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className={cn('pr-9', pinned && 'pl-8')}
        />

        {pinned && (
          <MapPin
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-sage"
            aria-label="Coordinates attached — this will appear on the map"
          />
        )}

        <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : value.place ? (
            <button
              type="button"
              aria-label="Clear place"
              onClick={() => onChange({ place: '', lat: null, lng: null })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-[var(--shadow-float)]"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.lat},${suggestion.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(suggestion)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  index === highlight ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                )}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="leading-snug">{suggestion.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pinned && (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">
          Pinned at {value.lat!.toFixed(3)}, {value.lng!.toFixed(3)} — this will show on the map.
        </p>
      )}
    </div>
  );
}
