import {
  ADJECTIVES_BY_BUCKET,
  CAMP_USERNAME_SEPARATOR,
  MAX_CAMP_USERNAME_LEN,
  type AdjectiveBucket,
} from './adjectives';

/**
 * Normalize a club slug for use as the camp_username suffix.
 *
 * - Preserves the original letter case (so `Klalofu` stays `Klalofu`).
 * - Preserves digits and underscores (so `kiwi_v_chili` stays recognizable).
 * - Strips any other non-`[A-Za-z0-9_]` characters (rare edge case).
 */
export function normalizeSlug(slug: string): string {
  return slug.replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Choose adjective length bucket based on normalized slug length.
 * Tuned so `adjective + "_" + slug` lands around 14–16 chars.
 */
export function pickBucket(slugLength: number): AdjectiveBucket {
  if (slugLength <= 4) return 'long';
  if (slugLength <= 7) return 'medium';
  if (slugLength <= 11) return 'short';
  return 'tiny';
}

/** Ordered fallback chain from a starting bucket toward shorter adjectives. */
const BUCKET_FALLBACK_ORDER: readonly AdjectiveBucket[] = [
  'long',
  'medium',
  'short',
  'tiny',
];

/**
 * Get fallback buckets to try if collisions exhaust the primary bucket,
 * or if the resulting camp_username exceeds `MAX_CAMP_USERNAME_LEN`.
 * Order: primary → progressively shorter.
 */
export function bucketFallbacks(primary: AdjectiveBucket): readonly AdjectiveBucket[] {
  const idx = BUCKET_FALLBACK_ORDER.indexOf(primary);
  return BUCKET_FALLBACK_ORDER.slice(idx);
}

/** Format adjective and normalized slug into the final camp_username. */
export function formatCampUsername(adjective: string, normalizedSlug: string): string {
  return `${adjective}${CAMP_USERNAME_SEPARATOR}${normalizedSlug}`;
}

/**
 * Return all candidate camp_usernames for a slug, randomized within each bucket
 * and ordered primary→fallback. Use this generator on the server, then probe
 * each candidate against the DB until one is unique.
 *
 * `rng` should return a uniform integer in [0, n). Use a CSPRNG (`crypto.randomInt`).
 */
export function* generateCandidates(
  slug: string,
  rng: (n: number) => number,
): Generator<string, void, unknown> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return;

  const primary = pickBucket(normalizedSlug.length);

  for (const bucket of bucketFallbacks(primary)) {
    const pool = ADJECTIVES_BY_BUCKET[bucket];
    // Fisher-Yates over indices, lazily — just shuffle and iterate.
    const shuffled = shuffleIndices(pool.length, rng);
    for (const i of shuffled) {
      const candidate = formatCampUsername(pool[i]!, normalizedSlug);
      if (candidate.length <= MAX_CAMP_USERNAME_LEN) {
        yield candidate;
      }
    }
  }
}

function shuffleIndices(n: number, rng: (max: number) => number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
