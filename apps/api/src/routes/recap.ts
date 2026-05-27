import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { isCampOver } from '@vklube/shared';
import type { RecapStats } from '@vklube/shared';
import type { AppEnv } from '../types';

const recap = new Hono<AppEnv>();

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { data: RecapStats; expiresAt: number } | null = null;

interface StatsRow {
  total_participants: string | number;
  total_meetings: string | number;
  mean: string | number | null;
  median: string | number | null;
  p25: string | number | null;
  p75: string | number | null;
  p90: string | number | null;
}

interface FirstMeetingRow {
  initiator_username: string;
  initiator_camp_username: string | null;
  initiator_display_name: string;
  initiator_avatar_url: string | null;
  target_username: string;
  target_camp_username: string | null;
  target_display_name: string;
  target_avatar_url: string | null;
  confirmed_at: string;
}

interface HolderRow {
  username: string;
  camp_username: string | null;
  display_name: string;
  avatar_url: string | null;
  count: string | number;
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v);
}

async function computeStats(): Promise<RecapStats> {
  // Per-user confirmed counts (UNION ALL initiator + target)
  // → median/mean/percentiles + totals.
  const statsResult = await db.execute(sql`
    WITH per_user AS (
      SELECT username, COUNT(*)::int AS cnt
      FROM (
        SELECT initiator_username AS username FROM meetings WHERE status = 'confirmed'
        UNION ALL
        SELECT target_username AS username FROM meetings WHERE status = 'confirmed'
      ) AS m
      GROUP BY username
    )
    SELECT
      COUNT(*)::int AS total_participants,
      COALESCE(SUM(cnt), 0)::int / 2 AS total_meetings,
      COALESCE(AVG(cnt), 0)::float AS mean,
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt), 0)::float AS median,
      COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cnt), 0)::float AS p25,
      COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cnt), 0)::float AS p75,
      COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY cnt), 0)::float AS p90
    FROM per_user
  `);
  const statsRow = (statsResult as unknown as StatsRow[])[0];

  // First confirmed meeting of the camp.
  const firstResult = await db.execute(sql`
    SELECT
      m.initiator_username,
      ui.camp_username AS initiator_camp_username,
      ui.display_name AS initiator_display_name,
      ui.avatar_url AS initiator_avatar_url,
      m.target_username,
      ut.camp_username AS target_camp_username,
      ut.display_name AS target_display_name,
      ut.avatar_url AS target_avatar_url,
      m.confirmed_at
    FROM meetings m
    JOIN users ui ON ui.username = m.initiator_username
    JOIN users ut ON ut.username = m.target_username
    WHERE m.status = 'confirmed' AND m.confirmed_at IS NOT NULL
    ORDER BY m.confirmed_at ASC
    LIMIT 1
  `);
  const firstRow = (firstResult as unknown as FirstMeetingRow[])[0];

  // Top networker (most confirmed meetings as initiator or target).
  const topNetworkerResult = await db.execute(sql`
    WITH per_user AS (
      SELECT username, COUNT(*)::int AS cnt
      FROM (
        SELECT initiator_username AS username FROM meetings WHERE status = 'confirmed'
        UNION ALL
        SELECT target_username AS username FROM meetings WHERE status = 'confirmed'
      ) AS m
      GROUP BY username
    )
    SELECT
      p.username,
      u.camp_username,
      u.display_name,
      u.avatar_url,
      p.cnt AS count
    FROM per_user p
    JOIN users u ON u.username = p.username
    ORDER BY p.cnt DESC, p.username ASC
    LIMIT 1
  `);
  const topNetworkerRow = (topNetworkerResult as unknown as HolderRow[])[0];

  // Top witness.
  const topWitnessResult = await db.execute(sql`
    SELECT
      m.witness_username AS username,
      u.camp_username,
      u.display_name,
      u.avatar_url,
      COUNT(*)::int AS count
    FROM meetings m
    JOIN users u ON u.username = m.witness_username
    WHERE m.status = 'confirmed' AND m.witness_username IS NOT NULL
    GROUP BY m.witness_username, u.camp_username, u.display_name, u.avatar_url
    ORDER BY count DESC, username ASC
    LIMIT 1
  `);
  const topWitnessRow = (topWitnessResult as unknown as HolderRow[])[0];

  return {
    median: num(statsRow?.median),
    mean: num(statsRow?.mean),
    p25: num(statsRow?.p25),
    p75: num(statsRow?.p75),
    p90: num(statsRow?.p90),
    total_participants: num(statsRow?.total_participants),
    total_meetings: num(statsRow?.total_meetings),
    global_achievements: {
      first_meeting: firstRow
        ? {
            initiator: {
              username: firstRow.initiator_username,
              camp_username: firstRow.initiator_camp_username,
              display_name: firstRow.initiator_display_name,
              avatar_url: firstRow.initiator_avatar_url,
            },
            target: {
              username: firstRow.target_username,
              camp_username: firstRow.target_camp_username,
              display_name: firstRow.target_display_name,
              avatar_url: firstRow.target_avatar_url,
            },
            confirmed_at:
              typeof firstRow.confirmed_at === 'string'
                ? firstRow.confirmed_at
                : new Date(firstRow.confirmed_at).toISOString(),
          }
        : null,
      top_networker: topNetworkerRow
        ? {
            username: topNetworkerRow.username,
            camp_username: topNetworkerRow.camp_username,
            display_name: topNetworkerRow.display_name,
            avatar_url: topNetworkerRow.avatar_url,
            count: num(topNetworkerRow.count),
          }
        : null,
      top_witness: topWitnessRow
        ? {
            username: topWitnessRow.username,
            camp_username: topWitnessRow.camp_username,
            display_name: topWitnessRow.display_name,
            avatar_url: topWitnessRow.avatar_url,
            count: num(topWitnessRow.count),
          }
        : null,
    },
  };
}

/**
 * GET /api/recap/stats — Camp-wide aggregate stats for the Recap page.
 * Locked until CAMP_END_DATE; identical for all users (cached in-memory).
 */
recap.get('/stats', async (c) => {
  if (!isCampOver()) {
    return c.json({ error: 'recap_locked', message: 'Recap opens after the camp ends.' }, 404);
  }

  const now = Date.now();
  if (!cached || cached.expiresAt < now) {
    const data = await computeStats();
    cached = { data, expiresAt: now + CACHE_TTL_MS };
  }

  c.header('Cache-Control', 'public, max-age=300');
  return c.json(cached.data);
});

export default recap;
