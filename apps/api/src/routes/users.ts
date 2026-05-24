import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

const usersRouter = new Hono();

/**
 * GET /api/users/:camp_username — Get user profile by camp_username.
 *
 * Only camp_username is accepted as the public identifier; the club slug
 * (users.username) is never used in URLs to prevent enumeration via the
 * known list of club members.
 */
usersRouter.get('/:camp_username', async (c) => {
  const campUsername = c.req.param('camp_username').toLowerCase();

  const [user] = await db
    .select({
      username: users.username,
      camp_username: users.camp_username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      bio: users.bio,
      confirmed_contacts_count: users.confirmed_contacts_count,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.camp_username, campUsername))
    .limit(1);

  if (!user) {
    return c.json({ error: 'not_found', message: 'User not found' }, 404);
  }

  return c.json(user);
});

export default usersRouter;
