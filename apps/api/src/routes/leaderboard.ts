import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, sql, and, ne, or } from 'drizzle-orm';
import { LEADERBOARD_VISIBLE_TOP } from '@vklube/shared';
import type { AppEnv } from '../types';

const leaderboard = new Hono<AppEnv>();

/**
 * GET /api/leaderboard — Anonymized rankings by confirmed meetings
 */
leaderboard.get('/', async (c) => {
  const currentUser = c.get('user');

  // Count confirmed meetings per user (both as initiator and target)
  const result = await db.execute(sql`
    WITH meeting_counts AS (
      SELECT username, COUNT(*) as confirmed_count
      FROM (
        SELECT initiator_username AS username FROM meetings WHERE status = 'confirmed'
        UNION ALL
        SELECT target_username AS username FROM meetings WHERE status = 'confirmed'
      ) AS all_meetings
      GROUP BY username
      ORDER BY confirmed_count DESC
    ),
    ranked AS (
      SELECT
        username,
        confirmed_count,
        RANK() OVER (ORDER BY confirmed_count DESC) as rank
      FROM meeting_counts
    )
    SELECT
      r.rank,
      r.username,
      r.confirmed_count,
      u.display_name,
      u.avatar_url
    FROM ranked r
    JOIN users u ON u.username = r.username
    ORDER BY r.rank ASC
  `);

  const rows = result as unknown as Array<{
    rank: number;
    username: string;
    confirmed_count: number;
    display_name: string;
    avatar_url: string;
  }>;

  const entries = rows.map((row) => ({
    rank: Number(row.rank),
    confirmed_count: Number(row.confirmed_count),
    is_self: row.username === currentUser?.username,
    // Only reveal identity for top N or self
    username: Number(row.rank) <= LEADERBOARD_VISIBLE_TOP || row.username === currentUser?.username
      ? row.username
      : null,
    display_name: Number(row.rank) <= LEADERBOARD_VISIBLE_TOP || row.username === currentUser?.username
      ? row.display_name
      : null,
    avatar_url: Number(row.rank) <= LEADERBOARD_VISIBLE_TOP || row.username === currentUser?.username
      ? row.avatar_url
      : null,
  }));

  return c.json(entries);
});

export default leaderboard;
