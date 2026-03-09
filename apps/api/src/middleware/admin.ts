import type { Context, Next } from 'hono';

/**
 * Admin middleware — must be used after authMiddleware.
 * Checks that the authenticated user has is_admin flag.
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user');

  if (!user?.is_admin) {
    return c.json({ error: 'forbidden', message: 'Admin access required' }, 403);
  }

  return next();
}
