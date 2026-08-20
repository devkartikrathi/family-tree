import { ApiError } from './api';

/**
 * A small in-process token bucket. It runs per function instance rather than
 * globally, so treat it as a guardrail against runaway clients and accidental
 * loops — not as a defence against a determined attacker. Vercel's WAF and
 * BotID sit in front of this in production.
 */
interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > 300_000) buckets.delete(key);
  }
}

export interface RateLimit {
  /** Sustained requests per minute. */
  perMinute: number;
  /** Instantaneous allowance. */
  burst?: number;
}

export const LIMITS = {
  mutation: { perMinute: 120, burst: 40 },
  create: { perMinute: 60, burst: 20 },
  invite: { perMinute: 20, burst: 8 },
  geocode: { perMinute: 30, burst: 10 },
  upload: { perMinute: 20, burst: 6 },
  join: { perMinute: 12, burst: 5 },
} satisfies Record<string, RateLimit>;

export function consume(key: string, limit: RateLimit): void {
  const now = Date.now();
  sweep(now);

  const capacity = limit.burst ?? limit.perMinute;
  const refillPerMs = limit.perMinute / 60_000;

  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const refilled = Math.min(capacity, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);

  if (refilled < 1) {
    buckets.set(key, { tokens: refilled, updatedAt: now });
    throw ApiError.tooMany();
  }

  buckets.set(key, { tokens: refilled - 1, updatedAt: now });
}
