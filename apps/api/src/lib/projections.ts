import { sql } from 'drizzle-orm';
import { meetings, users } from '../schema';

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
export function meetingProjection(currentUserSlug: string) {
  return {
    id: meetings.id,
    initiator_camp_username: initiatorCampUsername,
    target_camp_username: targetCampUsername,
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

