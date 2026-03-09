import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types';

const auth = new Hono<AppEnv>();

/**
 * GET /api/auth/login — Redirect to OIDC provider
 */
auth.get('/login', (c) => {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuer || !clientId || !redirectUri) {
    return c.json({ error: 'config_error', message: 'OIDC not configured' }, 500);
  }

  // TODO: Replace with proper OIDC authorization URL construction
  // For now, redirect to a placeholder
  const authUrl = `${issuer}/auth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile`;

  return c.redirect(authUrl);
});

/**
 * GET /api/auth/callback — Handle OIDC callback
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'bad_request', message: 'Missing authorization code' }, 400);
  }

  // TODO: Exchange code for tokens with OIDC provider
  // TODO: Extract user info from ID token
  // TODO: Upsert user in database
  // TODO: Create session cookie

  // Placeholder: for dev, redirect to dashboard
  return c.redirect('/');
});

/**
 * GET /api/auth/me — Get current authenticated user
 */
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'unauthorized', message: 'Not authenticated' }, 401);
  }
  return c.json(user);
});

/**
 * POST /api/auth/logout — End session
 */
auth.post('/logout', (c) => {
  // TODO: Clear session cookie / invalidate session
  return c.json({ ok: true });
});

/**
 * POST /api/auth/dev-login — Dev-only: create/login as any user
 * Only available when NODE_ENV !== 'production'
 */
auth.post('/dev-login', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'not_found', message: 'Not found' }, 404);
  }

  const { username, display_name } = await c.req.json<{
    username: string;
    display_name?: string;
  }>();

  if (!username) {
    return c.json({ error: 'bad_request', message: 'username is required' }, 400);
  }

  // Upsert user
  const [user] = await db
    .insert(users)
    .values({
      username,
      display_name: display_name || username,
      avatar_url: '',
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        display_name: display_name || username,
      },
    })
    .returning();

  // In dev mode, the username acts as the session token
  return c.json(user);
});

export default auth;
