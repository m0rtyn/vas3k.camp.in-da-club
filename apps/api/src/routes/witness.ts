import { Hono } from 'hono';
import { db } from '../db';
import { meetings, users } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { CONTACTS_PER_APPROVAL } from '@vklube/shared';
import type { AppEnv } from '../types';

const witnessRouter = new Hono<AppEnv>();

/**
 * POST /api/witness/confirm — Confirm a meeting as witness (by code only)
 * Body: { witness_code: string }
 */
witnessRouter.post('/confirm', async (c) => {
  const witness = c.get('user');
  const { witness_code } = await c.req.json<{ witness_code: string }>();

  if (!witness_code || witness_code.length !== 4) {
    return c.json({ error: 'bad_request', message: 'A valid 4-digit witness_code is required' }, 400);
  }

  try {
    const confirmed = await db.transaction(async (tx) => {
      // Find pending meeting with this code (1-min grace) — lock row
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

      if (!meeting) throw new WitnessError(404, 'not_found', 'No active meeting found with this code');

      if (witness.username === meeting.initiator_username || witness.username === meeting.target_username) {
        throw new WitnessError(403, 'forbidden', 'Cannot witness your own meeting');
      }

      // Lock witness row and check approvals atomically
      const [witnessRow] = await tx
        .select({ approvals_available: users.approvals_available })
        .from(users)
        .where(eq(users.username, witness.username))
        .for('update')
        .limit(1);

      if (!witnessRow || witnessRow.approvals_available < 1) {
        throw new WitnessError(400, 'bad_request', 'No available approvals');
      }

      // 1. Confirm meeting
      const [updated] = await tx
        .update(meetings)
        .set({
          status: 'confirmed',
          witness_username: witness.username,
          confirmed_at: new Date(),
        })
        .where(eq(meetings.id, meeting.id))
        .returning();

      // 2. Decrement witness approvals
      await tx
        .update(users)
        .set({ approvals_available: sql`${users.approvals_available} - 1` })
        .where(eq(users.username, witness.username));

      // 3. Increment counts for both participants + bonus approval check
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

      return updated;
    });

    return c.json(confirmed);
  } catch (err) {
    if (err instanceof WitnessError) {
      return c.json({ error: err.code, message: err.message }, err.status as 400 | 403 | 404);
    }
    console.error('Witness confirm error:', err);
    return c.json({ error: 'internal', message: 'Internal error' }, 500);
  }
});

class WitnessError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export default witnessRouter;
