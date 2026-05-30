import { randomInt } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  ADJ_TINY,
  CAMP_USERNAME_SEPARATOR,
  MAX_CAMP_USERNAME_LEN,
  formatCampUsername,
  generateCandidates,
  normalizeSlug,
} from '@vklube/shared';
import { db } from '../db';
import { users } from '../schema';

class UserNotFoundError extends Error {
  constructor(slug: string) {
    super(`No user row for slug=${slug}`);
    this.name = 'UserNotFoundError';
  }
}

const MAX_BUCKET_PROBES = 60;
const MAX_NUMERIC_FALLBACK_ATTEMPTS = 100;
const NUMERIC_FALLBACK_RANGE = 10_000;
const NUMERIC_FALLBACK_PAD = 4;

/**
 * Generate a unique camp_username for a club slug and persist it on the user row.
 *
 * Tries random adjectives from the appropriate length bucket; falls back to
 * progressively shorter buckets if all candidates collide with existing rows.
 * Final fallback: tiny-bucket adjective + numeric suffix `_NN`.
 *
 * @returns The persisted camp_username, or `null` if persistence failed.
 */
export async function generateAndAssignCampUsername(slug: string): Promise<string | null> {
  const rng = (n: number) => randomInt(0, n);
  const tried = new Set<string>();

  for (const candidate of generateCandidates(slug, rng)) {
    if (tried.size >= MAX_BUCKET_PROBES) break;
    if (tried.has(candidate)) continue;
    tried.add(candidate);

    const assigned = await tryAssign(slug, candidate);
    if (assigned) return assigned;
  }

  // Numeric-suffix fallback: pick from the shortest bucket so `_NN` (+3 chars)
  // still fits within MAX_CAMP_USERNAME_LEN.
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  for (let attempt = 0; attempt < MAX_NUMERIC_FALLBACK_ATTEMPTS; attempt++) {
    const adjective = ADJ_TINY[rng(ADJ_TINY.length)]!;
    const suffix = String(rng(NUMERIC_FALLBACK_RANGE)).padStart(NUMERIC_FALLBACK_PAD, '0');
    const candidate = `${formatCampUsername(adjective, normalized)}${CAMP_USERNAME_SEPARATOR}${suffix}`;
    if (candidate.length > MAX_CAMP_USERNAME_LEN) continue;
    if (tried.has(candidate)) continue;
    tried.add(candidate);

    const assigned = await tryAssign(slug, candidate);
    if (assigned) return assigned;
  }

  return null;
}

async function tryAssign(slug: string, candidate: string): Promise<string | null> {
  try {
    // Only update rows where camp_username is still NULL. This makes the
    // operation idempotent under concurrent first-request races: if another
    // request already assigned a value, the UPDATE matches 0 rows and we
    // re-read the persisted value below.
    const [row] = await db
      .update(users)
      .set({ camp_username: candidate })
      .where(and(eq(users.username, slug), isNull(users.camp_username)))
      .returning({ camp_username: users.camp_username });

    if (row) return row.camp_username;

    // 0 rows updated → either slug doesn't exist, or camp_username is already
    // set by a concurrent request. Re-read to distinguish.
    const [existing] = await db
      .select({ camp_username: users.camp_username })
      .from(users)
      .where(eq(users.username, slug))
      .limit(1);

    if (!existing) throw new UserNotFoundError(slug);
    return existing.camp_username; // already assigned by another request
  } catch (err: unknown) {
    // Unique-violation → collision with another row; caller will try next candidate.
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === '23505';
}

/**
 * Resolve a camp_username to the underlying club slug (users.username).
 * Returns null if no user matches.
 *
 * Lookup is case-insensitive so that legacy NFC cards printed with a
 * lowercased camp_username still resolve, while new cards generated with
 * case-preserved camp_usernames also work.
 */
export async function resolveCampUsernameToSlug(campUsername: string): Promise<string | null> {
  const [row] = await db
    .select({ username: users.username })
    .from(users)
    .where(sql`LOWER(${users.camp_username}) = LOWER(${campUsername})`)
    .limit(1);
  return row?.username ?? null;
}
