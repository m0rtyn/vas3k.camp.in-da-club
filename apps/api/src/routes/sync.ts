import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, and, ne, or, sql } from 'drizzle-orm';
import { CANCEL_WINDOW_MS } from '@vklube/shared';
import type { SyncAction } from '@vklube/shared';
import type { AppEnv } from '../types';

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
      const { target_username, client_created_at } = item.payload as {
        target_username: string;
        client_created_at: string;
      };

      // Check for existing active meeting
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
        return existing[0]; // Already exists, return it (idempotent)
      }

      const [meeting] = await db
        .insert(meetings)
        .values({
          initiator_username: user.username,
          target_username,
          status: 'unconfirmed',
          client_created_at: new Date(client_created_at),
        })
        .returning();

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

      const [cancelled] = await db
        .update(meetings)
        .set({ status: 'cancelled', cancelled_at: new Date() })
        .where(eq(meetings.id, meeting_id))
        .returning();

      return cancelled;
    }

    case 'hide_meeting': {
      const { meeting_id } = item.payload as { meeting_id: string };

      const [updated] = await db
        .update(meetings)
        .set({
          hidden_by: sql`array_append(${meetings.hidden_by}, ${user.username})`,
        })
        .where(eq(meetings.id, meeting_id))
        .returning();

      return updated;
    }

    case 'unhide_meeting': {
      const { meeting_id } = item.payload as { meeting_id: string };

      const [updated] = await db
        .update(meetings)
        .set({
          hidden_by: sql`array_remove(${meetings.hidden_by}, ${user.username})`,
        })
        .where(eq(meetings.id, meeting_id))
        .returning();

      return updated;
    }

    case 'witness_meeting': {
      // Phase 2 — stub for now
      throw new Error('Witness mechanic not yet implemented');
    }

    default:
      throw new Error(`Unknown action: ${item.action}`);
  }
}

export default sync;
