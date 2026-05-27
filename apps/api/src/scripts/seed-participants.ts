/**
 * Pre-seed users + camp_usernames from a CSV file.
 *
 * Each non-empty, non-comment line has 2–3 comma-separated columns:
 *
 *   <camp_url_or_null>, <club_url_or_null>[, <display_name>]
 *
 * Where:
 *   <camp_url>    = "https://vk.vas3k.cloud/<camp_username>"  or  "null"
 *                   (auto-generate; requires a club_url in this row)
 *   <club_url>    = "https://vas3k.club/user/<slug>"  or  "null"  (guest)
 *   <display_name> optional; defaults to the slug (or to the camp_username
 *                  for guests). For club members, OIDC overwrites this with
 *                  the real full_name on first login.
 *
 * Lenient parsing:
 *   - Order of the two URL columns is tolerated (we scan both).
 *   - Trailing commas / empty cells are ignored.
 *   - Lines starting with `#` or `//` are comments.
 *
 * Database effects per row:
 *   - camp_url present:
 *       1. INSERT user with placeholder data ON CONFLICT DO NOTHING.
 *       2. UPDATE camp_username WHERE camp_username IS NULL.
 *   - camp_url == null  (slug required):
 *       1. INSERT user (placeholder) ON CONFLICT DO NOTHING.
 *       2. Generate a unique camp_username via generateAndAssignCampUsername.
 *
 * If any null-camp rows were processed, an updated CSV with the resolved
 * camp URLs is written next to the input as `<input>.out.csv`.
 *
 * Re-runnable; first occurrence of duplicate camp_username/slug wins,
 * subsequent duplicates are reported as skipped.
 *
 * Usage:
 *   bun run apps/api/src/scripts/seed-participants.ts [--db <url>] [path/to/file.csv]
 *
 * The DB URL can be passed via --db / --db=<url>, or via DATABASE_URL env.
 * The CLI flag takes precedence over the env var.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, basename, extname, join, resolve } from 'node:path';
import { randomInt } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import {
  ADJECTIVES_BY_BUCKET,
  CAMP_USERNAME_SEPARATOR,
  MAX_CAMP_USERNAME_LEN,
  pickBucket,
  bucketFallbacks,
  formatCampUsername,
} from '@vklube/shared';
import { users } from '../schema';

const DEFAULT_PATH = 'camp-usernames.csv';

function parseCliArgs(argv: string[]): { inputPath: string; dbUrl: string } {
  const rest: string[] = [];
  let dbUrl: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--db' || a === '-d') {
      const next = argv[i + 1];
      if (!next) throw new Error(`${a} requires a value`);
      dbUrl = next;
      i++;
      continue;
    }
    if (a.startsWith('--db=')) {
      dbUrl = a.slice('--db='.length);
      continue;
    }
    if (a === '--help' || a === '-h') {
      console.log(
        'Usage: bun run apps/api/src/scripts/seed-participants.ts [--db <url>] [path/to/file.csv]',
      );
      process.exit(0);
    }
    rest.push(a);
  }

  dbUrl = dbUrl ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('Database URL is required. Pass --db <url> or set DATABASE_URL env var.');
  }

  return { inputPath: resolve(rest[0] || DEFAULT_PATH), dbUrl };
}

const cli = parseCliArgs(process.argv.slice(2));
// Must set env BEFORE loading the db module — it reads DATABASE_URL at import time.
process.env.DATABASE_URL = cli.dbUrl;

const { db } = await import('../db');

/**
 * Case-preserving slug normalization for the seed script: keeps original
 * letter case (only strips characters outside `[A-Za-z0-9_]`). The shared
 * `normalizeSlug` lowercases, which destroys case in generated camp_usernames
 * (e.g. `Katya_G` → `katya_g`). We want stickers/URLs to keep the user's
 * preferred casing.
 */
function normalizeSlugPreserveCase(slug: string): string {
  return slug.replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Local variant of `generateAndAssignCampUsername` that preserves slug case
 * in the camp_username suffix. Mirrors the production retry/fallback logic
 * but uses `normalizeSlugPreserveCase` instead of the lowercasing variant.
 */
async function generateCampUsernamePreserveCase(slug: string): Promise<string | null> {
  const rng = (n: number) => randomInt(0, n);
  const normalized = normalizeSlugPreserveCase(slug);
  if (!normalized) return null;

  const tried = new Set<string>();
  const MAX_PROBES = 60;
  const primary = pickBucket(normalized.length);

  outer: for (const bucket of bucketFallbacks(primary)) {
    const pool = ADJECTIVES_BY_BUCKET[bucket];
    const indices = Array.from({ length: pool.length }, (_, i) => i);
    // Fisher–Yates shuffle.
    for (let i = indices.length - 1; i > 0; i--) {
      const j = rng(i + 1);
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    for (const i of indices) {
      if (tried.size >= MAX_PROBES) break outer;
      const candidate = formatCampUsername(pool[i]!, normalized);
      if (candidate.length > MAX_CAMP_USERNAME_LEN) continue;
      if (tried.has(candidate)) continue;
      tried.add(candidate);

      const assigned = await tryAssignCamp(slug, candidate);
      if (assigned) return assigned;
    }
  }

  // Numeric-suffix fallback (tiny bucket adjectives only, leave room for "_NNNN").
  const tinyPool = ADJECTIVES_BY_BUCKET.tiny;
  for (let attempt = 0; attempt < 100; attempt++) {
    const adj = tinyPool[rng(tinyPool.length)]!;
    const suffix = String(rng(10_000)).padStart(4, '0');
    const candidate = `${formatCampUsername(adj, normalized)}${CAMP_USERNAME_SEPARATOR}${suffix}`;
    if (candidate.length > MAX_CAMP_USERNAME_LEN) continue;
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    const assigned = await tryAssignCamp(slug, candidate);
    if (assigned) return assigned;
  }

  return null;
}

async function tryAssignCamp(slug: string, candidate: string): Promise<string | null> {
  try {
    const [row] = await db
      .update(users)
      .set({ camp_username: candidate })
      .where(and(eq(users.username, slug), isNull(users.camp_username)))
      .returning({ camp_username: users.camp_username });
    if (row) return row.camp_username;

    // 0 rows updated — either user missing or already has a camp_username.
    const [existing] = await db
      .select({ camp_username: users.camp_username })
      .from(users)
      .where(eq(users.username, slug))
      .limit(1);
    if (!existing) return null;
    return existing.camp_username;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
      return null; // unique violation → try next candidate
    }
    throw err;
  }
}

interface CsvRow {
  lineNo: number;
  raw: string;
  /** Lowercased camp_username extracted from the vk.vas3k.cloud URL. */
  camp: string | null;
  /** Club slug, case-preserved, extracted from vas3k.club/user URL. `null` for guests. */
  slug: string | null;
  /** Optional display name from column 3. */
  displayName: string | null;
}

const CAMP_HOST_RE = /vk\.vas3k\.cloud\/([A-Za-z0-9_-]+)/;
const CLUB_HOST_RE = /vas3k\.club\/user\/([A-Za-z0-9_-]+)/;

function parseCsv(content: string): CsvRow[] {
  const out: CsvRow[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('//')) continue;

    const cells = line.split(',').map((c) => c.trim());
    let camp: string | null = null;
    let slug: string | null = null;
    let displayName: string | null = null;

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c]!;
      if (!cell || cell.toLowerCase() === 'null') continue;

      const campMatch = cell.match(CAMP_HOST_RE);
      if (campMatch?.[1]) {
        if (!camp) camp = campMatch[1];
        continue;
      }
      const clubMatch = cell.match(CLUB_HOST_RE);
      if (clubMatch?.[1]) {
        if (!slug) slug = clubMatch[1];
        continue;
      }
      // First non-URL, non-null, non-empty cell wins as display_name.
      if (!displayName) displayName = cell;
    }

    out.push({ lineNo: i + 1, raw: line, camp, slug, displayName });
  }

  return out;
}

type SeedRow = {
  username: string;
  campUsername: string;
  displayName: string;
  source: 'club' | 'guest';
};

async function insertPlaceholder(username: string, displayName: string): Promise<boolean> {
  const inserts = await db
    .insert(users)
    .values({
      username,
      display_name: displayName,
      avatar_url: '',
      bio: null,
    })
    .onConflictDoNothing()
    .returning({ username: users.username });
  return inserts.length > 0;
}

async function upsertSeedRow(row: SeedRow): Promise<{ inserted: boolean; assigned: boolean }> {
  const ins = await insertPlaceholder(row.username, row.displayName);

  const updates = await db
    .update(users)
    .set({ camp_username: row.campUsername })
    .where(and(eq(users.username, row.username), isNull(users.camp_username)))
    .returning({ camp_username: users.camp_username });

  return { inserted: ins, assigned: updates.length > 0 };
}

function formatOutputLine(camp: string, slug: string | null, displayName: string | null): string {
  const campUrl = `https://vk.vas3k.cloud/${camp}`;
  const clubUrl = slug ? `https://vas3k.club/user/${slug}` : 'null';
  return displayName ? `${campUrl}, ${clubUrl}, ${displayName}` : `${campUrl}, ${clubUrl}`;
}

function outputPathFor(inputPath: string): string {
  const dir = dirname(inputPath);
  const ext = extname(inputPath);
  const stem = basename(inputPath, ext);
  return join(dir, `${stem}.out${ext || '.csv'}`);
}

async function main() {
  const inputPath = cli.inputPath;
  // Mask password in URL for logs.
  const dbForLog = cli.dbUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2');
  console.log(`DB: ${dbForLog}`);
  console.log(`Reading: ${inputPath}\n`);

  const content = readFileSync(inputPath, 'utf8');
  const rows = parseCsv(content);

  console.log(`Parsed ${rows.length} non-empty rows.\n`);

  type PendingRow =
    | { kind: 'seed'; row: SeedRow; lineNo: number }
    | { kind: 'generate'; slug: string; displayName: string | null; lineNo: number };

  const pending: PendingRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCamp = new Set<string>();
  const seenUsername = new Set<string>();

  for (const r of rows) {
    // Branch A: camp_username missing → require slug, will generate.
    if (!r.camp) {
      if (!r.slug) {
        errors.push(`  ! line ${r.lineNo}: no camp_username and no club slug — "${r.raw}"`);
        continue;
      }
      if (seenUsername.has(r.slug)) {
        warnings.push(`  ~ line ${r.lineNo}: username "${r.slug}" duplicates earlier line, skipping`);
        continue;
      }
      seenUsername.add(r.slug);
      pending.push({ kind: 'generate', slug: r.slug, displayName: r.displayName, lineNo: r.lineNo });
      continue;
    }

    // Branch B: camp_username provided.
    if (r.camp.length > MAX_CAMP_USERNAME_LEN) {
      errors.push(`  ! line ${r.lineNo}: @${r.camp} exceeds MAX_CAMP_USERNAME_LEN=${MAX_CAMP_USERNAME_LEN}`);
      continue;
    }
    if (seenCamp.has(r.camp)) {
      warnings.push(`  ~ line ${r.lineNo}: @${r.camp} duplicates earlier line, skipping`);
      continue;
    }

    const isGuest = !r.slug;
    const username = r.slug ?? r.camp; // guest username = camp_username (no club slug)

    if (seenUsername.has(username)) {
      warnings.push(`  ~ line ${r.lineNo}: username "${username}" duplicates earlier line, skipping`);
      continue;
    }

    seenCamp.add(r.camp);
    seenUsername.add(username);

    pending.push({
      kind: 'seed',
      lineNo: r.lineNo,
      row: {
        username,
        campUsername: r.camp,
        displayName: r.displayName ?? username,
        source: isGuest ? 'guest' : 'club',
      },
    });
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const w of warnings) console.log(w);
    console.log('');
  }
  if (errors.length > 0) {
    console.error('Errors:');
    for (const e of errors) console.error(e);
    console.error('');
  }

  // --- Apply to DB ------------------------------------------------------

  let inserted = 0;
  let userExisted = 0;
  let assigned = 0;
  let alreadyAssigned = 0;
  let generated = 0;
  let generateFailed = 0;

  const outputLines: string[] = [];

  for (const p of pending) {
    if (p.kind === 'seed') {
      const { inserted: ins, assigned: asg } = await upsertSeedRow(p.row);
      if (ins) inserted++;
      else userExisted++;
      if (asg) {
        assigned++;
        console.log(
          `  + ${p.row.username.padEnd(28)} → @${p.row.campUsername.padEnd(24)} [${p.row.source}]`,
        );
      } else {
        alreadyAssigned++;
        console.log(`  = ${p.row.username.padEnd(28)} (camp_username already set)`);
      }
      outputLines.push(
        formatOutputLine(
          p.row.campUsername,
          p.row.source === 'guest' ? null : p.row.username,
          p.row.displayName,
        ),
      );
      continue;
    }

    // kind === 'generate'
    const ins = await insertPlaceholder(p.slug, p.displayName ?? p.slug);
    if (ins) inserted++;
    else userExisted++;

    const camp = await generateCampUsernamePreserveCase(p.slug);
    if (!camp) {
      generateFailed++;
      errors.push(`  ! line ${p.lineNo}: failed to generate camp_username for slug=${p.slug}`);
      console.error(`  FAILED: ${p.slug} (could not generate camp_username)`);
      continue;
    }

    if (seenCamp.has(camp)) {
      warnings.push(
        `  ~ line ${p.lineNo}: generated @${camp} duplicates an explicit entry, kept generated`,
      );
    }
    seenCamp.add(camp);

    // We can't distinguish "newly generated" vs "already had one" cheaply here
    // without an extra read; treat as generated for the counter and rely on
    // user_existed=N to indicate idempotent reruns.
    generated++;
    console.log(`  + ${p.slug.padEnd(28)} → @${camp.padEnd(24)} [generated]`);
    outputLines.push(formatOutputLine(camp, p.slug, p.displayName));
  }

  // --- Write output CSV if any rows were auto-generated -----------------

  const hadGenerateRows = pending.some((p) => p.kind === 'generate');
  if (hadGenerateRows && outputLines.length > 0) {
    const outPath = outputPathFor(inputPath);
    writeFileSync(outPath, outputLines.join('\n') + '\n', 'utf8');
    console.log(`\nWrote updated CSV: ${outPath}`);
  }

  console.log(
    `\nDone. users_inserted=${inserted} users_existed=${userExisted} ` +
      `camp_assigned=${assigned} already_assigned=${alreadyAssigned} ` +
      `generated=${generated} generate_failed=${generateFailed} ` +
      `warnings=${warnings.length} errors=${errors.length}`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
