/**
 * One-off backfill: generate camp_username for every user that doesn't have one.
 *
 * Run with: `bun run apps/api/src/scripts/backfill-camp-usernames.ts`
 */

import { isNull } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';
import { generateAndAssignCampUsername } from '../lib/camp-username';

async function main() {
  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(isNull(users.camp_username));

  console.log(`Backfilling ${rows.length} users...`);

  let ok = 0;
  let failed = 0;
  for (const { username } of rows) {
    const assigned = await generateAndAssignCampUsername(username);
    if (assigned) {
      ok++;
      console.log(`  ${username} → ${assigned}`);
    } else {
      failed++;
      console.error(`  FAILED: ${username}`);
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
