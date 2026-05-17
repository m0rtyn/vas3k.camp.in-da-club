import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { db } from '../db';
import { users, sessions } from '../schema';
import { eq, and, gt } from 'drizzle-orm';
import { SESSION_COOKIE_NAME } from '../lib/session';

export type AuthUser = {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string | null;
  approvals_available: number;
  confirmed_contacts_count: number;
  is_admin: boolean;
};

type Env = {
  Variables: {
    user: AuthUser;
    sessionId: string;
  };
};

/**
 * Auth middleware — validates session cookie against sessions table.
 * In dev mode with DEV_USER env, falls back to that user (no session record).
 */
export async function authMiddleware(c: Context<Env>, next: Next) {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);

  if (sessionId) {
    const [row] = await db
      .select({
        username: users.username,
        display_name: users.display_name,
        avatar_url: users.avatar_url,
        bio: users.bio,
        approvals_available: users.approvals_available,
        confirmed_contacts_count: users.confirmed_contacts_count,
        is_admin: users.is_admin,
      })
      .from(sessions)
      .innerJoin(users, eq(users.username, sessions.username))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expires_at, new Date())))
      .limit(1);

    if (row) {
      c.set('user', row);
      c.set('sessionId', sessionId);
      return next();
    }
  }

  // Dev-only fallback: DEV_USER env for auto-login without session
  const devUser = process.env.DEV_USER;
  if (devUser && process.env.NODE_ENV !== 'production') {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, devUser))
      .limit(1);

    if (user) {
      c.set('user', user);
      return next();
    }
  }

  return c.json({ error: 'unauthorized', message: 'Not authenticated' }, 401);
}
