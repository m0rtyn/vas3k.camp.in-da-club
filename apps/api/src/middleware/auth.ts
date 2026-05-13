import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

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
  };
};

/**
 * Auth middleware — validates session and attaches user to context.
 * In dev mode (DEV_USER env var set), bypasses OIDC and uses that username.
 */
export async function authMiddleware(c: Context<Env>, next: Next) {
  // Check Bearer token or session cookie
  const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
    || getCookie(c, 'session');

  if (sessionToken) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, sessionToken))
      .limit(1);

    if (user) {
      c.set('user', user);
      return next();
    }
  }

  // Fallback: DEV_USER env for auto-login without token (dev only)
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
