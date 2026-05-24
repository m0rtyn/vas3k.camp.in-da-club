/**
 * Pre-seed users + camp_usernames from a CSV file.
 *
 * Each non-empty, non-comment line has 2–3 comma-separated columns:
 *
 *   <camp_url>, <club_url_or_null>[, <display_name>]
 *
 * Where:
 *   <camp_url>    = "https://vk.vas3k.cloud/<camp_username>"
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
 *   1. INSERT user with placeholder data ON CONFLICT DO NOTHING.
 *   2. UPDATE camp_username WHERE camp_username IS NULL.
 *
 * Re-runnable; first occurrence of duplicate camp_username/slug wins,
 * subsequent duplicates are reported as skipped.
 *
 * Usage:
 *   bun run apps/api/src/scripts/seed-participants.ts [path/to/file.csv]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';
import { MAX_CAMP_USERNAME_LEN } from '@vklube/shared';
import { db } from '../db';
import { users } from '../schema';

const DEFAULT_PATH = 'camp-usernames.csv';

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
        if (!camp) camp = campMatch[1].toLowerCase();
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

async function upsertSeedRow(row: SeedRow): Promise<{ inserted: boolean; assigned: boolean }> {
  const inserts = await db
    .insert(users)
    .values({
      username: row.username,
      display_name: row.displayName,
      avatar_url: '',
      bio: null,
    })
    .onConflictDoNothing()
    .returning({ username: users.username });

  const updates = await db
    .update(users)
    .set({ camp_username: row.campUsername })
    .where(and(eq(users.username, row.username), isNull(users.camp_username)))
    .returning({ camp_username: users.camp_username });

  return { inserted: inserts.length > 0, assigned: updates.length > 0 };
}

async function main() {
  const inputPath = resolve(process.argv[2] || DEFAULT_PATH);
  console.log(`Reading: ${inputPath}\n`);

  const content = readFileSync(inputPath, 'utf8');
  const rows = parseCsv(content);

  console.log(`Parsed ${rows.length} non-empty rows.\n`);

  const seedRows: SeedRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCamp = new Set<string>();
  const seenUsername = new Set<string>();

  for (const r of rows) {
    if (!r.camp) {
      errors.push(`  ! line ${r.lineNo}: no camp_username URL found — "${r.raw}"`);
      continue;
    }
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

    seedRows.push({
      username,
      campUsername: r.camp,
      displayName: r.displayName ?? username,
      source: isGuest ? 'guest' : 'club',
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

  for (const row of seedRows) {
    const { inserted: ins, assigned: asg } = await upsertSeedRow(row);
    if (ins) inserted++;
    else userExisted++;
    if (asg) {
      assigned++;
      console.log(
        `  + ${row.username.padEnd(28)} → @${row.campUsername.padEnd(24)} [${row.source}]`,
      );
    } else {
      alreadyAssigned++;
      console.log(`  = ${row.username.padEnd(28)} (camp_username already set)`);
    }
  }

  console.log(
    `\nDone. users_inserted=${inserted} users_existed=${userExisted} ` +
      `camp_assigned=${assigned} already_assigned=${alreadyAssigned} ` +
      `warnings=${warnings.length} errors=${errors.length}`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
