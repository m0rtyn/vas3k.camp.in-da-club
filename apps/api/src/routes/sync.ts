import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, and, ne, or, sql } from 'drizzle-orm';
import { CANCEL_WINDOW_MS, CONTACTS_PER_APPROVAL } from '@vklube/shared';
import type { SyncAction } from '@vklube/shared';
import type { AppEnv } from '../types';
import { meetingProjection, getProjectedMeeting } from '../lib/projections';
import { resolveCampUsernameToSlug } from '../lib/camp-username';

const sync = new Hono<AppEnv>();

interface SyncItem {
  action: SyncAction;
  payload: Record<string, unknown>;
  client_created_at: string;
}

interface SyncResult {
  index: number;
  action: SyncAction;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * POST /api/sync — Batch sync endpoint for offline queue replay
 * Body: { items: SyncItem[] }
 */
sync.post('/', async (c) => {
  const user = c.get('user') as { username: string };
  const { items } = await c.req.json<{ items: SyncItem[] }>();

  if (!Array.isArray(items)) {
    return c.json({ error: 'bad_request', message: 'items array is required' }, 400);
  }

  const results: SyncResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const result = await processAction(user, item);
      results.push({ index: i, action: item.action, success: true, data: result });
    } catch (err) {
      results.push({
        index: i,
        action: item.action,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return c.json({ results });
});

async function processAction(
  user: { username: string },
  item: SyncItem,
): Promise<unknown> {
  switch (item.action) {
    case 'create_meeting': {
      const { target_camp_username, client_created_at } = item.payload as {
        target_camp_username: string;
        client_created_at: string;
      };

      const target_username = await resolveCampUsernameToSlug(target_camp_username);
      if (!target_username) {
        throw new Error('Target user not found');
      }

      // Check for existing active meeting
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
        return existing[0]; // Already exists, return it (idempotent)
      }

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

      return meeting;
    }

    case 'cancel_meeting': {
      const { meeting_id } = item.payload as { meeting_id: string };

      const [meeting] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meeting_id))
        .limit(1);

      if (!meeting) throw new Error('Meeting not found');

      const elapsed = Date.now() - new Date(meeting.created_at).getTime();
      if (elapsed > CANCEL_WINDOW_MS) {
        throw new Error('Cancel window expired');
      }

      await db
        .update(meetings)
        .set({ status: 'cancelled', cancelled_at: new Date() })
        .where(eq(meetings.id, meeting_id));

      const cancelled = await getProjectedMeeting(db, meeting_id, user.username);

      return cancelled;
    }

    case 'hide_meeting':
    case 'unhide_meeting': {
      // Hide/unhide functionality removed — silently skip legacy queue items
      return { skipped: true };
    }

    case 'witness_meeting': {
      const { witness_code } = item.payload as { witness_code: string };

      if (!witness_code || witness_code.length !== 4) {
        throw new Error('Valid 4-digit witness_code is required');
      }

      return await db.transaction(async (tx) => {
        const [meeting] = await tx
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.status, 'pending'),
              eq(meetings.witness_code, witness_code),
              sql`${meetings.witness_code_expires_at} + interval '1 minute' >= NOW()`,
            ),
          )
          .for('update')
          .limit(1);

        if (!meeting) throw new Error('No active meeting found with this code');

        if (user.username === meeting.initiator_username || user.username === meeting.target_username) {
          throw new Error('Cannot witness your own meeting');
        }

        const [witnessUser] = await tx
          .select({ approvals_available: users.approvals_available })
          .from(users)
          .where(eq(users.username, user.username))
          .for('update')
          .limit(1);

        if (!witnessUser || witnessUser.approvals_available < 1) {
          throw new Error('No available approvals');
        }

        const [confirmed] = await tx
          .update(meetings)
          .set({
            status: 'confirmed',
            witness_username: user.username,
            confirmed_at: new Date(),
          })
          .where(eq(meetings.id, meeting.id))
          .returning({ id: meetings.id });

        await tx
          .update(users)
          .set({ approvals_available: sql`${users.approvals_available} - 1` })
          .where(eq(users.username, user.username));

        for (const username of [meeting.initiator_username, meeting.target_username]) {
          const [participant] = await tx
            .update(users)
            .set({ confirmed_contacts_count: sql`${users.confirmed_contacts_count} + 1` })
            .where(eq(users.username, username))
            .returning({ count: users.confirmed_contacts_count });

          if (participant && participant.count % CONTACTS_PER_APPROVAL === 0) {
            await tx
              .update(users)
              .set({ approvals_available: sql`${users.approvals_available} + 1` })
              .where(eq(users.username, username));
          }
        }

        const projected = await getProjectedMeeting(tx, confirmed.id, user.username);

        return projected;
      });
    }

    default:
      throw new Error(`Unknown action: ${item.action}`);
  }
}

export default sync;
