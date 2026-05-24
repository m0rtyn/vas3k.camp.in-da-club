import { eq, sql } from 'drizzle-orm';
import { meetings, users } from '../schema';
import type { db } from '../db';

/**
 * Anything that supports `.select(...)` like `db` or a transaction `tx`.
 * Lets helpers accept either a top-level database handle or a transaction.
 */
type MeetingSelector = Pick<typeof db, 'select'>;

/**
 * SQL fragment that resolves `meetings.initiator_username` (club slug) to the
 * matching `users.camp_username` via correlated subquery. Used in SELECT
 * projections so wire payloads only expose camp_username, never the club slug.
 */
export const initiatorCampUsername = sql<string>`(
  SELECT u.camp_username FROM ${users} u WHERE u.username = ${meetings.initiator_username}
)`.as('initiator_camp_username');

export const targetCampUsername = sql<string>`(
  SELECT u.camp_username FROM ${users} u WHERE u.username = ${meetings.target_username}
)`.as('target_camp_username');

export const witnessCampUsername = sql<string | null>`(
  SELECT u.camp_username FROM ${users} u WHERE u.username = ${meetings.witness_username}
)`.as('witness_camp_username');

/**
 * Standard projection for Meeting wire responses. Excludes raw club slugs
 * (initiator_username / target_username / witness_username) and the
 * `hidden_by` array (which contains slugs and would leak the club identity).
 *
 * The `is_hidden_by_me` flag is computed against the current user's slug.
 */
/**
 * Standard projection for Meeting wire responses.
 *
 * Includes both the club slug (used for display — the participant already
 * knows the person, so the familiar `@slug` is shown in the UI) and the
 * camp_username (used in URLs / NFC chip targets to prevent enumeration of
 * the known club member list).
 *
 * `hidden_by[]` (raw slug array) is replaced with a per-user computed
 * `is_hidden_by_me` boolean.
 */
export function meetingProjection(currentUserSlug: string) {
  return {
    id: meetings.id,
    initiator_username: meetings.initiator_username,
    initiator_camp_username: initiatorCampUsername,
    target_username: meetings.target_username,
    target_camp_username: targetCampUsername,
    witness_username: meetings.witness_username,
    witness_camp_username: witnessCampUsername,
    witness_code: meetings.witness_code,
    witness_code_expires_at: meetings.witness_code_expires_at,
    status: meetings.status,
    is_hidden_by_me: sql<boolean>`(${meetings.hidden_by} @> ARRAY[${currentUserSlug}]::text[])`.as('is_hidden_by_me'),
    created_at: meetings.created_at,
    confirmed_at: meetings.confirmed_at,
    cancelled_at: meetings.cancelled_at,
    client_created_at: meetings.client_created_at,
  };
}

/**
 * Fetch a single meeting by id with the standard projection. Accepts either
 * the top-level `db` or a transaction handle so it works inside `tx` blocks.
 */
export async function getProjectedMeeting(
  executor: MeetingSelector,
  id: string,
  currentUserSlug: string,
) {
  const [row] = await executor
    .select(meetingProjection(currentUserSlug))
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);
  return row;
}

