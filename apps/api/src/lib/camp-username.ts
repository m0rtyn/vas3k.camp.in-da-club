import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { generateCandidates } from '@vklube/shared';
import { db } from '../db';
import { users } from '../schema';

class UserNotFoundError extends Error {
  constructor(slug: string) {
    super(`No user row for slug=${slug}`);
    this.name = 'UserNotFoundError';
  }
}
/**
 * Generate a unique camp_username for a club slug and persist it on the user row.
 *
 * Tries random adjectives from the appropriate length bucket; falls back to
 * progressively shorter buckets if all candidates collide with existing rows.
 * Final fallback: appends a 2-digit random numeric suffix.
 *
 * @returns The persisted camp_username, or `null` if persistence failed.
 */
export async function generateAndAssignCampUsername(slug: string): Promise<string | null> {
  const rng = (n: number) => randomInt(0, n);
  const tried = new Set<string>();

  for (const candidate of generateCandidates(slug, rng)) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);

    const assigned = await tryAssign(slug, candidate);
    if (assigned) return assigned;

    // Cap probing to keep first-login latency bounded.
    if (tried.size >= 60) break;
  }

  // Numeric-suffix fallback.
  for (let attempt = 0; attempt < 20; attempt++) {
    const base = generateCandidates(slug, rng).next().value;
    if (!base) break;
    const suffix = String(rng(100)).padStart(2, '0');
    const candidate = `${base}_${suffix}`;
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    const assigned = await tryAssign(slug, candidate);
    if (assigned) return assigned;
  }

  return null;
}

async function tryAssign(slug: string, candidate: string): Promise<string | null> {
  try {
    const [row] = await db
      .update(users)
      .set({ camp_username: candidate })
      .where(eq(users.username, slug))
      .returning({ camp_username: users.camp_username });
    // No row updated → slug doesn't exist; treat as fatal so we don't loop
    // through every candidate for a phantom user.
    if (!row) throw new UserNotFoundError(slug);
    return row.camp_username;
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
 */
export async function resolveCampUsernameToSlug(campUsername: string): Promise<string | null> {
  const normalized = campUsername.toLowerCase();
  const [row] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.camp_username, normalized))
    .limit(1);
  return row?.username ?? null;
}
