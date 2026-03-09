import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, or, and, ne, sql, desc } from 'drizzle-orm';
import { CANCEL_WINDOW_MS } from '@vklube/shared';
import type { AppEnv } from '../types';

const meetingsRouter = new Hono<AppEnv>();

/**
 * POST /api/meetings — Create a new meeting
 */
meetingsRouter.post('/', async (c) => {
  const user = c.get('user');
  const { target_username, client_created_at } = await c.req.json<{
    target_username: string;
    client_created_at: string;
  }>();

  if (!target_username || !client_created_at) {
    return c.json({ error: 'bad_request', message: 'target_username and client_created_at are required' }, 400);
  }

  // Can't meet yourself
  if (target_username === user.username) {
    return c.json({ error: 'bad_request', message: 'Cannot create a meeting with yourself' }, 400);
  }

  // Check target exists
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.username, target_username))
    .limit(1);

  if (!target) {
    return c.json({ error: 'not_found', message: 'Target user not found' }, 404);
  }

  // Check if pair already has an active meeting (bidirectional)
  const existing = await db
    .select()
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
  const [meeting] = await db
    .insert(meetings)
    .values({
      initiator_username: user.username,
      target_username,
      status: 'unconfirmed',
      client_created_at: new Date(client_created_at),
    })
    .returning();

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
    .select()
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.created_at));

  return c.json(result);
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
      message: 'Cancel window has expired. You can hide this meeting instead.',
    }, 400);
  }

  // Hard delete — set status to cancelled
  const [cancelled] = await db
    .update(meetings)
    .set({
      status: 'cancelled',
      cancelled_at: new Date(),
    })
    .where(eq(meetings.id, meetingId))
    .returning();

  return c.json(cancelled);
});

/**
 * POST /api/meetings/:id/hide — Hide meeting from current user's list
 */
meetingsRouter.post('/:id/hide', async (c) => {
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

  if (meeting.initiator_username !== user.username && meeting.target_username !== user.username) {
    return c.json({ error: 'forbidden', message: 'Not a participant of this meeting' }, 403);
  }

  if (meeting.hidden_by.includes(user.username)) {
    return c.json(meeting); // Already hidden, no-op
  }

  const [updated] = await db
    .update(meetings)
    .set({
      hidden_by: sql`array_append(${meetings.hidden_by}, ${user.username})`,
    })
    .where(eq(meetings.id, meetingId))
    .returning();

  return c.json(updated);
});

/**
 * POST /api/meetings/:id/unhide — Unhide meeting from current user's list
 */
meetingsRouter.post('/:id/unhide', async (c) => {
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

  if (meeting.initiator_username !== user.username && meeting.target_username !== user.username) {
    return c.json({ error: 'forbidden', message: 'Not a participant of this meeting' }, 403);
  }

  const [updated] = await db
    .update(meetings)
    .set({
      hidden_by: sql`array_remove(${meetings.hidden_by}, ${user.username})`,
    })
    .where(eq(meetings.id, meetingId))
    .returning();

  return c.json(updated);
});

export default meetingsRouter;
