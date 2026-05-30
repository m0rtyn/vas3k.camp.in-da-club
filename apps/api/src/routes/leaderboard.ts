import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../schema';
import { sql } from 'drizzle-orm';
import { LEADERBOARD_VISIBLE_TOP } from '@vklube/shared';
import type { AppEnv } from '../types';

const leaderboard = new Hono<AppEnv>();

/**
 * Internal row shape from the ranked query. `username` is the club slug and
 * MUST NOT be sent to the client — it's only used here to detect `is_self`.
 */
type RankedRow = {
  rank: number;
  username: string;
  confirmed_count: number;
  camp_username: string | null;
  display_name: string;
  avatar_url: string;
};

const RANKED_CACHE_TTL_MS = 10_000;
let rankedCache: { at: number; rows: RankedRow[] } | null = null;

async function getRankedRows(): Promise<RankedRow[]> {
  const now = Date.now();
  if (rankedCache && now - rankedCache.at < RANKED_CACHE_TTL_MS) {
    return rankedCache.rows;
  }

  // Source of truth for ranking is `users.confirmed_contacts_count`, which is
  // atomically incremented for both participants on meeting confirmation
  // (see routes/sync.ts and routes/witness.ts). This avoids the previous
  // UNION ALL + GROUP BY scan over the `meetings` table on every request.
  const result = await db.execute(sql`
    SELECT
      RANK() OVER (ORDER BY confirmed_contacts_count DESC) AS rank,
      username,
      confirmed_contacts_count AS confirmed_count,
      camp_username,
      display_name,
      avatar_url
    FROM users
    WHERE confirmed_contacts_count > 0
    ORDER BY rank ASC
  `);

  const rows = (result as unknown as RankedRow[]).map((r) => ({
    rank: Number(r.rank),
    username: r.username,
    confirmed_count: Number(r.confirmed_count),
    camp_username: r.camp_username,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
  }));

  rankedCache = { at: now, rows };
  return rows;
}

/**
 * GET /api/leaderboard — Anonymized rankings by confirmed meetings
 */
leaderboard.get('/', async (c) => {
  const currentUser = c.get('user');
  const rows = await getRankedRows();

  const entries = rows.map((row) => {
    const isSelf = row.username === currentUser?.username;
    const reveal = row.rank <= LEADERBOARD_VISIBLE_TOP || isSelf;
    return {
      rank: row.rank,
      confirmed_count: row.confirmed_count,
      is_self: isSelf,
      // Only reveal identity for top N or self. The club slug (row.username)
      // is never returned to the client.
      camp_username: reveal ? row.camp_username : null,
      display_name: reveal ? row.display_name : null,
      avatar_url: reveal ? row.avatar_url : null,
    };
  });

  return c.json(entries);
});

export default leaderboard;
