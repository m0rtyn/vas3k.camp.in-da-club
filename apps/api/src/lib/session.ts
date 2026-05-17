import { randomBytes } from 'crypto';
import { db } from '../db';
import { sessions } from '../schema';
import { eq, lt } from 'drizzle-orm';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_COOKIE_NAME = 'session';

export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(username: string): Promise<{ id: string; expiresAt: Date }> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, username, expires_at: expiresAt });
  return { id, expiresAt };
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expires_at, new Date()));
}

export const sessionCookieOptions = (isProduction: boolean) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
});
