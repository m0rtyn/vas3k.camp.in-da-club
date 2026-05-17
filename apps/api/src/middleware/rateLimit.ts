import type { Context, Next } from 'hono';
import { getConnInfo } from 'hono/bun';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function keyFor(c: Context, scope: string): string {
  const user = c.get('user') as { username?: string } | undefined;
  if (user?.username) return `${scope}:user:${user.username}`;
  try {
    const info = getConnInfo(c);
    const ip = info.remote.address || 'unknown';
    return `${scope}:ip:${ip}`;
  } catch {
    return `${scope}:ip:unknown`;
  }
}

/**
 * Simple in-memory fixed-window rate limiter. Sufficient for single-instance Bun/Railway deploy.
 * @param scope unique label per route
 * @param max requests allowed per window
 * @param windowMs window duration in ms
 */
export function rateLimit(scope: string, max: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const key = keyFor(c, scope);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'rate_limited', message: 'Too many requests' }, 429);
    }

    bucket.count += 1;
    return next();
  };
}

// Periodic cleanup of expired buckets to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();
