import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types';
import { createSession, deleteSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '../lib/session';
import { generateAndAssignCampUsername } from '../lib/camp-username';

const auth = new Hono<AppEnv>();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * GET /api/auth/login — Redirect to vas3k.club OIDC provider
 */
auth.get('/login', (c) => {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuer || !clientId || !redirectUri) {
    return c.json({ error: 'config_error', message: 'OIDC not configured' }, 500);
  }

  const authUrl = `${issuer}/auth/openid/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid`;

  return c.redirect(authUrl);
});

/**
 * GET /api/auth/callback — Handle OIDC callback from vas3k.club
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'bad_request', message: 'Missing authorization code' }, 400);
  }

  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    return c.json({ error: 'config_error', message: 'OIDC not configured' }, 500);
  }

  // 1. Exchange authorization code for tokens
  const tokenRes = await fetch(`${issuer}/auth/openid/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error('OIDC token exchange failed:', tokenRes.status);
    return c.json({ error: 'auth_failed', message: 'Failed to exchange authorization code' }, 502);
  }

  const tokenData = await tokenRes.json() as { access_token: string; token_type: string };

  // 2. Fetch user profile from vas3k.club API
  const profileRes = await fetch(`${issuer}/user/me.json`, {
    headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    console.error('OIDC profile fetch failed:', profileRes.status);
    return c.json({ error: 'auth_failed', message: 'Failed to fetch user profile' }, 502);
  }

  const profileData = await profileRes.json() as {
    user: { slug: string; full_name: string; avatar: string; bio: string };
  };

  const { slug, full_name, avatar, bio } = profileData.user;

  // 3. Upsert user in database, then assign camp_username if missing.
  // Auth middleware also self-heals as a safety net, but we generate
  // synchronously here to avoid a window where the user is blocked by
  // generation failures on first authenticated request.
  const [upserted] = await db
    .insert(users)
    .values({
      username: slug,
      display_name: full_name,
      avatar_url: avatar || '',
      bio: bio || null,
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        display_name: full_name,
        avatar_url: avatar || '',
        bio: bio || null,
      },
    })
    .returning({ camp_username: users.camp_username });

  if (!upserted?.camp_username) {
    const assigned = await generateAndAssignCampUsername(slug);
    if (!assigned) {
      console.error('[auth/callback] camp_username generation failed for', slug);
      return c.json({ error: 'server_error', message: 'Failed to assign camp_username' }, 500);
    }
  }

  // 4. Create session and set httpOnly cookie
  const session = await createSession(slug);
  setCookie(c, SESSION_COOKIE_NAME, session.id, sessionCookieOptions(isProduction));

  // Redirect to frontend callback (no token in URL)
  const frontendOrigin = isProduction ? '' : (process.env.FRONTEND_URL || '');
  return c.redirect(`${frontendOrigin}/callback`);
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
auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionId) {
    await deleteSession(sessionId);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
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

  if (!user.camp_username) {
    const assigned = await generateAndAssignCampUsername(username);
    if (assigned) {
      user.camp_username = assigned;
    } else {
      console.error('[auth/dev-login] camp_username generation failed for', username);
    }
  }

  const session = await createSession(username);
  setCookie(c, SESSION_COOKIE_NAME, session.id, sessionCookieOptions(false));

  return c.json(user);
});

export default auth;
