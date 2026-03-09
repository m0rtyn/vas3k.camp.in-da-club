import { Hono } from 'hono';
import { db } from '../db';
import { approvalGrants, users, meetings } from '../schema';
import { eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../types';

const admin = new Hono<AppEnv>();

/**
 * POST /api/admin/grants — Grant approvals to a user or all users
 * Body: { username: string | '__all__', amount: number }
 */
admin.post('/grants', async (c) => {
  const currentUser = c.get('user');
  const { username, amount } = await c.req.json<{
    username: string;
    amount: number;
  }>();

  if (!username || typeof amount !== 'number' || amount <= 0) {
    return c.json({ error: 'bad_request', message: 'username and positive amount are required' }, 400);
  }

  // Log the grant
  await db.insert(approvalGrants).values({
    granted_by: currentUser.username,
    granted_to: username,
    amount,
  });

  if (username === '__all__') {
    // Bulk grant to all users
    await db
      .update(users)
      .set({
        approvals_available: sql`${users.approvals_available} + ${amount}`,
      });

    return c.json({ ok: true, message: `Granted ${amount} approvals to all users` });
  }

  // Individual grant
  const [updated] = await db
    .update(users)
    .set({
      approvals_available: sql`${users.approvals_available} + ${amount}`,
    })
    .where(eq(users.username, username))
    .returning();

  if (!updated) {
    return c.json({ error: 'not_found', message: 'User not found' }, 404);
  }

  return c.json({ ok: true, user: updated });
});

/**
 * GET /api/admin/stats — Event statistics
 */
admin.get('/stats', async (c) => {
  const [stats] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM meetings WHERE status = 'confirmed') as confirmed_meetings,
      (SELECT COUNT(*) FROM meetings WHERE status = 'unconfirmed') as unconfirmed_meetings,
      (SELECT COUNT(*) FROM meetings WHERE status = 'cancelled') as cancelled_meetings,
      (SELECT COUNT(*) FROM meetings WHERE status != 'cancelled'
        AND created_at > NOW() - INTERVAL '24 hours') as meetings_last_24h,
      (SELECT SUM(approvals_available) FROM users) as total_approvals_available
  `);

  return c.json(stats);
});

export default admin;
