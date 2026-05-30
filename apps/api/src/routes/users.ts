import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';

const usersRouter = new Hono();

/**
 * GET /api/users/:camp_username — Get user profile by camp_username.
 *
 * Only camp_username is accepted as the public identifier; the club slug
 * (users.username) is never used in URLs to prevent enumeration via the
 * known list of club members.
 *
 * Lookup is case-insensitive so that legacy NFC cards printed with a
 * lowercased camp_username still resolve to users whose stored value may
 * preserve original casing (post case-preserving normalizeSlug fix).
 */
usersRouter.get('/:camp_username', async (c) => {
  const campUsername = c.req.param('camp_username');

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
    .where(sql`LOWER(${users.camp_username}) = LOWER(${campUsername})`)
    .limit(1);

  if (!user) {
    return c.json({ error: 'not_found', message: 'User not found' }, 404);
  }

  return c.json(user);
});

export default usersRouter;
