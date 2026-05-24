import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, or, and, ne, sql, desc } from 'drizzle-orm';
import { CANCEL_WINDOW_MS, WITNESS_CODE_DURATION_MS, WITNESS_CODE_LENGTH, CONTACTS_PER_APPROVAL, MAX_CAMP_USERNAME_LEN } from '@vklube/shared';
import type { AppEnv } from '../types';
import { meetingProjection, getProjectedMeeting } from '../lib/projections';
import { resolveCampUsernameToSlug } from '../lib/camp-username';

const meetingsRouter = new Hono<AppEnv>();

/**
 * POST /api/meetings — Create a new meeting.
 *
 * Accepts `target_camp_username` on the wire; resolves it to the underlying
 * club slug (users.username) before persisting the FK.
 */
meetingsRouter.post('/', async (c) => {
  const user = c.get('user');
  const { target_camp_username, client_created_at } = await c.req.json<{
    target_camp_username: string;
    client_created_at: string;
  }>();

  if (!target_camp_username || !client_created_at) {
    return c.json({ error: 'bad_request', message: 'target_camp_username and client_created_at are required' }, 400);
  }

  if (target_camp_username.length > MAX_CAMP_USERNAME_LEN) {
    return c.json({ error: 'bad_request', message: 'target_camp_username too long' }, 400);
  }

  // Resolve target camp_username → slug
  const target_username = await resolveCampUsernameToSlug(target_camp_username);
  if (!target_username) {
    return c.json({ error: 'not_found', message: 'Target user not found' }, 404);
  }

  // Can't meet yourself
  if (target_username === user.username) {
    return c.json({ error: 'bad_request', message: 'Cannot create a meeting with yourself' }, 400);
  }

  // Check if pair already has an active meeting (bidirectional)
  const existing = await db
    .select(meetingProjection(user.username))
    .from(meetings)
    .where(
      and(
        ne(meetings.status, 'cancelled'),
        or(
          and(
            eq(meetings.initiator_username, user.username),
            eq(meetings.target_username, target_username),
          ),
          and(
            eq(meetings.initiator_username, target_username),
            eq(meetings.target_username, user.username),
          ),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json({
      error: 'conflict',
      message: 'Meeting already exists with this person',
      meeting: existing[0],
    }, 409);
  }

  // Create meeting
  const [inserted] = await db
    .insert(meetings)
    .values({
      initiator_username: user.username,
      target_username,
      status: 'unconfirmed',
      client_created_at: new Date(client_created_at),
    })
    .returning({ id: meetings.id });

  const meeting = await getProjectedMeeting(db, inserted.id, user.username);

  return c.json(meeting, 201);
});

/**
 * GET /api/meetings — List current user's meetings
 * Query params: ?status=confirmed|unconfirmed&show_hidden=true
 */
meetingsRouter.get('/', async (c) => {
  const user = c.get('user');
  const statusFilter = c.req.query('status');
  const showHidden = c.req.query('show_hidden') === 'true';

  const conditions = [
    or(
      eq(meetings.initiator_username, user.username),
      eq(meetings.target_username, user.username),
    ),
    ne(meetings.status, 'cancelled'),
  ];

  if (statusFilter && ['confirmed', 'unconfirmed', 'pending'].includes(statusFilter)) {
    conditions.push(eq(meetings.status, statusFilter as 'confirmed' | 'unconfirmed' | 'pending'));
  }

  if (!showHidden) {
    conditions.push(
      sql`NOT (${meetings.hidden_by} @> ARRAY[${user.username}]::text[])`,
    );
  }

  const result = await db
    .select(meetingProjection(user.username))
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.created_at));

  return c.json(result);
});

/**
 * GET /api/meetings/witnessed — List meetings where current user was the witness
 */
meetingsRouter.get('/witnessed', async (c) => {
  const user = c.get('user');

  const result = await db
    .select(meetingProjection(user.username))
    .from(meetings)
    .where(
      and(
        eq(meetings.witness_username, user.username),
        eq(meetings.status, 'confirmed'),
      ),
    )
    .orderBy(desc(meetings.confirmed_at));

  return c.json(result);
});

/**
 * GET /api/meetings/:id — Fetch a single meeting (must be participant or witness)
 */
meetingsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const meetingId = c.req.param('id');

  const meeting = await getProjectedMeeting(db, meetingId, user.username);

  if (!meeting) {
    return c.json({ error: 'not_found', message: 'Meeting not found' }, 404);
  }

  if (
    meeting.initiator_username !== user.username &&
    meeting.target_username !== user.username &&
    meeting.witness_username !== user.username
  ) {
    return c.json({ error: 'forbidden', message: 'Not a participant of this meeting' }, 403);
  }

  return c.json(meeting);
});

/**
 * POST /api/meetings/:id/cancel — Cancel a meeting (hard delete within 5 min)
 */
meetingsRouter.post('/:id/cancel', async (c) => {
  const user = c.get('user');
  const meetingId = c.req.param('id');

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting) {
    return c.json({ error: 'not_found', message: 'Meeting not found' }, 404);
  }

  // Must be initiator or target
  if (meeting.initiator_username !== user.username && meeting.target_username !== user.username) {
    return c.json({ error: 'forbidden', message: 'Not a participant of this meeting' }, 403);
  }

  // Must be within cancel window
  const elapsed = Date.now() - new Date(meeting.created_at).getTime();
  if (elapsed > CANCEL_WINDOW_MS) {
    return c.json({
      error: 'bad_request',
      message: 'Cancel window has expired.',
    }, 400);
  }

  // Hard delete — set status to cancelled
  await db
    .update(meetings)
    .set({
      status: 'cancelled',
      cancelled_at: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  const cancelled = await getProjectedMeeting(db, meetingId, user.username);

  return c.json(cancelled);
});

/**
 * POST /api/meetings/:id/request-witness — Generate a 4-digit witness code
 */
meetingsRouter.post('/:id/request-witness', async (c) => {
  const user = c.get('user');
  const meetingId = c.req.param('id');

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting) {
    return c.json({ error: 'not_found', message: 'Meeting not found' }, 404);
  }

  // Must be participant
  if (meeting.initiator_username !== user.username && meeting.target_username !== user.username) {
    return c.json({ error: 'forbidden', message: 'Not a participant of this meeting' }, 403);
  }

  // Must be unconfirmed or pending (allow re-requesting if code expired)
  if (meeting.status !== 'unconfirmed' && meeting.status !== 'pending') {
    return c.json({ error: 'bad_request', message: 'Meeting cannot be witnessed in its current state' }, 400);
  }

  // If already has active (non-expired) code, return it
  if (meeting.witness_code && meeting.witness_code_expires_at) {
    const expiresAt = new Date(meeting.witness_code_expires_at).getTime();
    if (expiresAt > Date.now()) {
      const projected = await getProjectedMeeting(db, meetingId, user.username);
      return c.json(projected);
    }
  }

  // Generate new 4-digit code
  const code = String(Math.floor(Math.random() * 10 ** WITNESS_CODE_LENGTH)).padStart(WITNESS_CODE_LENGTH, '0');
  const expiresAt = new Date(Date.now() + WITNESS_CODE_DURATION_MS);

  await db
    .update(meetings)
    .set({
      witness_code: code,
      witness_code_expires_at: expiresAt,
      status: 'pending',
    })
    .where(eq(meetings.id, meetingId));

  const updated = await getProjectedMeeting(db, meetingId, user.username);

  return c.json(updated);
});

export default meetingsRouter;
