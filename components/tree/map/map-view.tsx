'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Cake, MapPin, Route, Sparkles, Home } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PersonAvatar } from '@/components/person-avatar';
import { useTree } from '@/lib/hooks/use-tree';
import { displayName } from '@/lib/domain/graph';
import { formatPartialDate, lifespanLabel } from '@/lib/domain/dates';
import { cn } from '@/lib/utils';
import type { Person } from '@/lib/domain/types';

type PlaceKind = 'birth' | 'death' | 'home';

interface Pin {
  id: string;
  kind: PlaceKind;
  person: Person;
  label: string;
  date: string | null;
  position: LatLngTuple;
}

interface Journey {
  id: string;
  person: Person;
  from: LatLngTuple;
  to: LatLngTuple;
}

const KIND_META: Record<PlaceKind, { color: string; label: string; icon: typeof Cake }> = {
  birth: { color: 'var(--sage)', label: 'Born', icon: Cake },
  home: { color: 'var(--ochre)', label: 'Lived', icon: Home },
  death: { color: 'var(--muted-foreground)', label: 'Died', icon: Sparkles },
};

/** Pins that land on the exact same spot fan out so each stays clickable. */
function spiderfy(pins: Pin[]): Pin[] {
  const groups = new Map<string, Pin[]>();
  for (const pin of pins) {
    const key = `${pin.position[0].toFixed(4)},${pin.position[1].toFixed(4)}`;
    const list = groups.get(key);
    if (list) list.push(pin);
    else groups.set(key, [pin]);
  }

  const spread: Pin[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      spread.push(group[0]);
      continue;
    }
    const radius = 0.012 + group.length * 0.0015;
    group.forEach((pin, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      spread.push({
        ...pin,
        position: [
          pin.position[0] + Math.sin(angle) * radius,
          pin.position[1] + Math.cos(angle) * radius,
        ],
      });
    });
  }
  return spread;
}

/** A gentle arc, so two journeys between the same towns stay distinguishable. */
function arc(from: LatLngTuple, to: LatLngTuple, steps = 24): LatLngTuple[] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const curve = 0.16;

  const controlLat = midLat - dy * curve;
  const controlLng = midLng + dx * curve;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const inverse = 1 - t;
    return [
      inverse * inverse * lat1 + 2 * inverse * t * controlLat + t * t * lat2,
      inverse * inverse * lng1 + 2 * inverse * t * controlLng + t * t * lng2,
    ] as LatLngTuple;
  });
}

export function MapView({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (personId: string) => void;
}) {
  const { persons } = useTree();
  const { resolvedTheme } = useTheme();
  const [layers, setLayers] = useState<Record<PlaceKind, boolean>>({
    birth: true,
    home: true,
    death: true,
  });
  const [showJourneys, setShowJourneys] = useState(true);

  const { pins, journeys } = useMemo(() => {
    const collected: Pin[] = [];
    const routes: Journey[] = [];

    for (const person of persons) {
      if (person.birthLat !== null && person.birthLng !== null) {
        collected.push({
          id: `birth:${person.id}`,
          kind: 'birth',
          person,
          label: person.birthPlace ?? 'Birthplace',
          date: person.birthDate,
          position: [person.birthLat, person.birthLng],
        });
      }
      if (person.residenceLat !== null && person.residenceLng !== null) {
        collected.push({
          id: `home:${person.id}`,
          kind: 'home',
          person,
          label: person.residencePlace ?? 'Home',
          date: null,
          position: [person.residenceLat, person.residenceLng],
        });
      }
      if (person.deathLat !== null && person.deathLng !== null) {
        collected.push({
          id: `death:${person.id}`,
          kind: 'death',
          person,
          label: person.deathPlace ?? 'Place of death',
          date: person.deathDate,
          position: [person.deathLat, person.deathLng],
        });
      }

      // The line a life travelled: born there, ended up here.
      const destination =
        person.residenceLat !== null && person.residenceLng !== null
          ? ([person.residenceLat, person.residenceLng] as LatLngTuple)
          : person.deathLat !== null && person.deathLng !== null
            ? ([person.deathLat, person.deathLng] as LatLngTuple)
            : null;

      if (person.birthLat !== null && person.birthLng !== null && destination) {
        const from: LatLngTuple = [person.birthLat, person.birthLng];
        const moved =
          Math.abs(from[0] - destination[0]) > 0.05 || Math.abs(from[1] - destination[1]) > 0.05;
        if (moved) routes.push({ id: person.id, person, from, to: destination });
      }
    }

    return { pins: spiderfy(collected), journeys: routes };
  }, [persons]);

  const visiblePins = pins.filter((pin) => layers[pin.kind]);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (pins.length === 0) return null;
    const lats = pins.map((pin) => pin.position[0]);
    const lngs = pins.map((pin) => pin.position[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [pins]);

  if (pins.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={<MapPin className="size-6" />}
          title="No places pinned yet"
          description="Type a town into anyone's birthplace or home and pick it from the suggestions — the coordinates come along, and they appear here."
        />
      </div>
    );
  }

  const tiles =
    resolvedTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="relative h-full w-full">
      <MapContainer
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [60, 60] }}
        center={[20.59, 78.96]}
        zoom={4}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          key={resolvedTheme}
          url={tiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />

        {showJourneys &&
          journeys.map((journey) => (
            <Polyline
              key={`journey:${journey.id}`}
              positions={arc(journey.from, journey.to)}
              pathOptions={{
                color: 'var(--ochre)',
                weight: journey.person.id === selectedId ? 2.5 : 1.25,
                opacity: journey.person.id === selectedId ? 0.9 : 0.35,
                dashArray: '4 6',
              }}
            />
          ))}

        {visiblePins.map((pin) => {
          const active = pin.person.id === selectedId;
          return (
            <CircleMarker
              key={pin.id}
              center={pin.position}
              radius={active ? 9 : 6}
              eventHandlers={{ click: () => onSelect(pin.person.id) }}
              pathOptions={{
                color: 'var(--background)',
                weight: 2,
                fillColor: KIND_META[pin.kind].color,
                fillOpacity: active ? 1 : 0.8,
              }}
            >
              <Popup>
                <div className="flex min-w-52 items-start gap-3 p-3">
                  <PersonAvatar person={pin.person} size="md" />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{displayName(pin.person)}</p>
                    <p className="text-xs text-muted-foreground">{lifespanLabel(pin.person)}</p>
                    <p className="mt-1.5 text-xs">
                      <span className="font-medium">{KIND_META[pin.kind].label}</span>{' '}
                      {pin.date ? formatPartialDate(pin.date, 'short') : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{pin.label}</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <FitToSelection pins={pins} selectedId={selectedId} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-between gap-3 p-4">
        <div className="pointer-events-auto rounded-xl border border-border bg-card/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur">
          <p className="mb-2 text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Show
          </p>
          <div className="space-y-1">
            {(Object.keys(KIND_META) as PlaceKind[]).map((kind) => {
              const meta = KIND_META[kind];
              const count = pins.filter((pin) => pin.kind === kind).length;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setLayers((current) => ({ ...current, [kind]: !current[kind] }))}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs transition-opacity',
                    layers[kind] ? 'opacity-100' : 'opacity-40',
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-2 ring-card"
                    style={{ background: meta.color }}
                  />
                  <span className="flex-1 text-left">{meta.label}</span>
                  <span className="font-mono text-muted-foreground">{count}</span>
                </button>
              );
            })}

            {journeys.length > 0 && (
              <button
                type="button"
                onClick={() => setShowJourneys((current) => !current)}
                className={cn(
                  'mt-1 flex w-full items-center gap-2 border-t border-border pt-2 text-xs transition-opacity',
                  showJourneys ? 'opacity-100' : 'opacity-40',
                )}
              >
                <Route className="size-3 text-ochre" />
                <span className="flex-1 text-left">Journeys</span>
                <span className="font-mono text-muted-foreground">{journeys.length}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pans to whoever is selected elsewhere in the app. */
function FitToSelection({ pins, selectedId }: { pins: Pin[]; selectedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const pin = pins.find((candidate) => candidate.person.id === selectedId);
    if (!pin) return;
    map.flyTo(pin.position, Math.max(map.getZoom(), 6), { duration: 0.8 });
  }, [selectedId, pins, map]);

  return null;
}
