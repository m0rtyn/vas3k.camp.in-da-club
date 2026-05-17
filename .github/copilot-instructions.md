# ВКлубе — Copilot Instructions

## Project Overview

**ВКлубе** is a lightweight offline-first PWA for meeting people at camps and events. Users create meetings with each other, confirm them via a witness mechanism, and track their contacts. The app works fully offline and syncs when connectivity returns.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + React DOM | 19.0 |
| Routing | React Router DOM | 7.1 |
| State | Zustand | 5.0 |
| Build | Vite + vite-plugin-pwa | 6.1 |
| Styles | CSS Modules | — |
| Offline DB | idb (IndexedDB wrapper) | 8.0 |
| Service Worker | Workbox | 7.3 |
| Backend | Hono (on Bun) | 4.7 |
| ORM | Drizzle ORM | 0.38 |
| Database | PostgreSQL | — |
| Shared | @vklube/shared workspace package | — |

## Monorepo Structure

```
apps/web/        — React 19 SPA (PWA), offline-first client
apps/api/        — Hono HTTP API, serves both REST endpoints and static SPA build
packages/shared/ — Shared TypeScript types, constants, (future) validation schemas
docs/            — Specs, known issues, refactoring plans
drizzle/         — Database migration files
```

## Development Commands

```bash
bun install                  # Install all workspace dependencies
bun run dev                  # Start both API and web dev servers
bun run build                # Build all packages
bun run db:migrate           # Run Drizzle migrations
bun run db:generate          # Generate new migration from schema changes
```

## Key Conventions

### TypeScript
- Strict mode enabled across all packages
- Shared types live in `packages/shared/src/types.ts` — import as `@vklube/shared`
- Shared constants in `packages/shared/src/constants.ts`
- Prefer type imports: `import type { Meeting } from '@vklube/shared'`

### React (apps/web)
- **React 19** — use modern APIs: `use()`, `useOptimistic()`, `useTransition()`, ref-as-prop
- **Functional components only** (except ErrorBoundary which requires class syntax)
- **Zustand 5** for global state — stores in `src/store/`
- **CSS Modules** for styling — each component/page has a `.module.css` file
- **No UI library** — all components are custom, keep them lightweight
- **Offline-first**: all data operations must work without network. Write to IndexedDB first, sync later
- Path alias: `@` maps to `apps/web/src/`

### API (apps/api)
- **Hono 4** framework on **Bun** runtime
- Routes in `src/routes/`, middleware in `src/middleware/`
- **Drizzle ORM** for all database queries — avoid raw SQL
- Auth: Bearer token or `session` cookie → validated against users table
- Error responses: `{ error: string, message?: string }` with appropriate HTTP status

### Offline-First Architecture
- **Local DB**: IndexedDB with three stores: `meetings`, `users`, `syncQueue`
- **Sync pattern**: Local write → IndexedDB → syncQueue → batch POST to `/api/sync` when online
- **Service Worker**: Workbox with NetworkFirst for API, StaleWhileRevalidate for navigation
- **Optimistic updates**: UI updates immediately from local state, server sync happens in background
- Every feature must degrade gracefully when offline

### Code Style
- camelCase for variables/functions, PascalCase for components/types
- No default exports for utilities, prefer named exports
- Keep components small — extract hooks for complex logic
- Russian language for user-facing strings (UI text, error messages)
- English for code: variable names, comments, commit messages

## Important Files

- `docs/refactoring_plan.md` — Prioritized list of known issues and planned improvements
- `docs/issues.md` — Runtime bugs and platform-specific problems
- `apps/web/src/lib/sync.ts` — Core sync logic (local-first write → batch sync)
- `apps/web/src/lib/db.ts` — IndexedDB schema and helpers
- `apps/web/src/store/meetings.ts` — Meeting CRUD with optimistic updates
- `apps/api/src/schema.ts` — Drizzle database schema (users, meetings, approvalGrants)
- `packages/shared/src/types.ts` — All shared TypeScript types
