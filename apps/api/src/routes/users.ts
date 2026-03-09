import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

const usersRouter = new Hono();

/**
 * GET /api/users/:username — Get user profile
 */
usersRouter.get('/:username', async (c) => {
  const username = c.req.param('username');

  const [user] = await db
    .select({
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      bio: users.bio,
      confirmed_contacts_count: users.confirmed_contacts_count,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return c.json({ error: 'not_found', message: 'User not found' }, 404);
  }

  return c.json(user);
});

export default usersRouter;
