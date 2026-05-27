import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import { adminMiddleware } from './middleware/admin';
import { rateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import meetingsRoutes from './routes/meetings';
import witnessRoutes from './routes/witness';
import usersRoutes from './routes/users';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import syncRoutes from './routes/sync';
import recapRoutes from './routes/recap';
import { db } from './db';

const app = new Hono();

// CORS for development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }));
}

// --- Health: pings DB ---
app.get('/api/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ ok: true });
  } catch (err) {
    console.error('Healthcheck DB error:', err);
    return c.json({ ok: false, error: 'db_unavailable' }, 503);
  }
});

// --- Auth routes (mostly public, /me requires auth) ---
app.use('/api/auth/login', rateLimit('auth_login', 10, 60_000));
app.use('/api/auth/dev-login', rateLimit('auth_dev_login', 10, 60_000));
app.use('/api/auth/me', authMiddleware);
app.route('/api/auth', authRoutes);

// --- Protected API routes (require auth) ---
app.use('/api/meetings/*', authMiddleware, rateLimit('meetings', 60, 60_000));
app.use('/api/meetings', authMiddleware, rateLimit('meetings', 60, 60_000));
app.route('/api/meetings', meetingsRoutes);

app.use('/api/witness/*', authMiddleware, rateLimit('witness', 10, 60_000));
app.use('/api/witness', authMiddleware, rateLimit('witness', 10, 60_000));
app.route('/api/witness', witnessRoutes);

app.use('/api/users/*', authMiddleware, rateLimit('users', 60, 60_000));
app.use('/api/users', authMiddleware, rateLimit('users', 60, 60_000));
app.route('/api/users', usersRoutes);

app.use('/api/leaderboard', authMiddleware);
app.route('/api/leaderboard', leaderboardRoutes);

app.use('/api/recap/*', authMiddleware, rateLimit('recap', 30, 60_000));
app.route('/api/recap', recapRoutes);

app.use('/api/sync', authMiddleware);
app.route('/api/sync', syncRoutes);

// --- Admin routes (require auth + admin) ---
app.use('/api/admin/*', authMiddleware, adminMiddleware);
app.route('/api/admin', adminRoutes);

// --- Static file serving (production: Vite build output) ---
// Resolve relative to this file: src/index.ts → ../../web/dist
const webDist = path.resolve(import.meta.dir, '../../web/dist');

app.get('/*', async (c, next) => {
  if (c.req.path.startsWith('/api')) return next();

  // Resolve and ensure the path stays within webDist (path traversal guard)
  const requestedPath = path.resolve(webDist, '.' + c.req.path);
  const isInsideDist =
    requestedPath === webDist || requestedPath.startsWith(webDist + path.sep);

  if (isInsideDist) {
    const file = Bun.file(requestedPath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  // SPA fallback
  const indexFile = Bun.file(path.join(webDist, 'index.html'));
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return next();
});

export default {
  port: Number(process.env.PORT) || 3010,
  fetch: app.fetch,
};
