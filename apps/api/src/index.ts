import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import { adminMiddleware } from './middleware/admin';
import authRoutes from './routes/auth';
import meetingsRoutes from './routes/meetings';
import usersRoutes from './routes/users';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import syncRoutes from './routes/sync';

const app = new Hono();

// CORS for development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/*', cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }));
}

// --- Auth routes (mostly public, /me requires auth) ---
app.use('/api/auth/me', authMiddleware);
app.route('/api/auth', authRoutes);

// --- Protected API routes (require auth) ---
app.use('/api/meetings/*', authMiddleware);
app.use('/api/meetings', authMiddleware);
app.route('/api/meetings', meetingsRoutes);

app.use('/api/users/*', authMiddleware);
app.route('/api/users', usersRoutes);

app.use('/api/leaderboard', authMiddleware);
app.route('/api/leaderboard', leaderboardRoutes);

app.use('/api/sync', authMiddleware);
app.route('/api/sync', syncRoutes);

// --- Admin routes (require auth + admin) ---
app.use('/api/admin/*', authMiddleware, adminMiddleware);
app.route('/api/admin', adminRoutes);

// --- Static file serving (production: Vite build output) ---
// Resolve relative to this file: src/index.ts → ../../web/dist
const webDist = path.resolve(import.meta.dir, '../../web/dist');

app.get('/*', async (c, next) => {
  // Skip API routes
  if (c.req.path.startsWith('/api')) return next();

  const filePath = path.join(webDist, c.req.path);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
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
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
