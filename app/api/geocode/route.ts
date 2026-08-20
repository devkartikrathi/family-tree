import { prisma } from '@/lib/db';
import { ok, parseQuery, route } from '@/lib/server/api';
import { requireUserId } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import { GeocodeQuerySchema } from '@/lib/domain/schemas';

export const runtime = 'nodejs';

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
  kind: string;
}

const CACHE_TTL_MS = 30 * 86_400_000;

/**
 * Place lookup, so nobody ever types a latitude by hand again.
 *
 * OpenStreetMap's Nominatim needs no API key, which means this works the
 * moment the app is cloned. It also asks for no more than one request per
 * second, so results are cached in our own database and the endpoint is rate
 * limited per user.
 */
export const GET = route(async (request) => {
  const userId = await requireUserId();
  consume(`geocode:${userId}`, LIMITS.geocode);

  const { q } = parseQuery(request, GeocodeQuerySchema);
  const key = q.toLowerCase();

  const cached = await prisma.geocodeCache.findUnique({ where: { query: key } });
  if (cached && Date.now() - cached.createdAt.getTime() < CACHE_TTL_MS) {
    return ok({ results: cached.result as unknown as PlaceSuggestion[], cached: true });
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '6');
  url.searchParams.set('addressdetails', '0');

  let results: PlaceSuggestion[] = [];
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Legacy Family Tree (https://github.com/legacy-family-tree)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(6_000),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        display_name: string;
        lat: string;
        lon: string;
        type?: string;
      }[];

      results = payload.map((row) => ({
        label: row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
        kind: row.type ?? 'place',
      }));
    }
  } catch (error) {
    logger.warn({ err: error }, 'Geocoder unavailable');
    // A place search that fails should never block someone from typing a place
    // name — the field accepts free text, coordinates are the bonus.
    return ok({ results: [], unavailable: true });
  }

  if (results.length > 0) {
    await prisma.geocodeCache.upsert({
      where: { query: key },
      update: { result: results as never, createdAt: new Date() },
      create: { query: key, result: results as never },
    });
  }

  return ok({ results, cached: false });
});
