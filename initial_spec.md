
## Plan: VKlube (in da club) — NFC Networking PWA for Vas3k.Camp

**TL;DR**: A lightweight offline-first PWA where camp participants log meetings via NFC chip scans, with an optional "Witness" mechanic (third person confirms the meeting happened) to gamify real conversations. Bun monorepo: React 19 + Vite frontend + Hono API backend, Supabase PostgreSQL, deployed to Railway. Three development phases: MVP (scan+log), Witness mechanic, Achievements.

---

### Architecture

| Layer | Tech | Why |
|---|---|---|
| Monorepo | **Bun workspaces** | Single repo, fast installs, native TypeScript, built-in test runner |
| Frontend | React 19 + Vite + Zustand | Lightweight, fast build, user-specified |
| PWA/Offline | vite-plugin-pwa + Workbox + `idb` | Best Vite integration; `idb` is a 1.2KB IndexedDB wrapper |
| Backend | **Hono** (on Bun runtime) | Ultralight web framework (~14KB), edge-ready, great DX with Bun |
| Database | **PostgreSQL on Railway** + **Drizzle ORM** | Same platform as API, EU region (low latency from Serbia), type-safe queries, no extra vendor |
| Auth | `oidc-client-ts` + `react-oidc-context` (client) + server-side session validation | Battle-tested OIDC library for vas3k.club |
| Hosting | **Railway** | Single platform for frontend + backend, automatic HTTPS, simple deploys from monorepo |

### Monorepo Structure

```
vas3k.camp.in-da-club/
├── package.json              # Bun workspace root
├── bun.lock
├── packages/
│   └── shared/               # Shared types, constants, validation schemas
│       ├── package.json
│       └── src/
│           ├── types.ts      # Meeting, User, Achievement types
│           └── constants.ts  # Approval economy numbers, code duration, etc.
├── apps/
│   ├── web/                  # Frontend (React 19 + Vite PWA)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── store/        # Zustand stores
│   │       ├── pages/        # Route components
│   │       ├── components/   # UI components
│   │       ├── lib/          # sync engine, IndexedDB, auth
│   │       └── sw.ts         # Service worker (injectManifest)
│   └── api/                  # Backend (Hono on Bun)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts      # Hono app entry
│       │   ├── routes/       # meetings, witness, users, admin, auth
│       │   ├── db.ts         # Drizzle client + connection pool
│       │   ├── schema.ts     # Drizzle schema definitions
│       │   └── middleware/    # Auth, admin check, rate limiting
│       └── Dockerfile        # For Railway deployment
├── drizzle/                  # Drizzle migrations
│   └── migrations/
└── README.md
```

**Root `package.json`** (Bun workspaces):
```json
{
  "name": "vklube",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

**Why Hono + Bun + Drizzle (no Supabase)?**
- Full control over API logic (witness reconciliation, approval economy, offline sync merge)
- Bun runtime is fast and runs TypeScript natively — no build step for backend
- Hono is ~14KB, supports middleware, and is framework-agnostic
- Drizzle ORM: type-safe SQL, lightweight (~50KB), generates migrations, Drizzle Studio for data inspection
- PostgreSQL on Railway: same platform as the API service — one provider, one region (EU), lower latency, simpler ops
- No unused Supabase features (their Auth, REST API, Realtime, RLS — all replaced by Hono + Drizzle)
- Single Railway project deploys API + frontend + DB

### Railway Deployment

- **Single Railway service**: Hono backend serves the Vite-built static frontend from `apps/web/dist/`
- Build command: `bun install && bun run --filter web build`
- Start command: `bun run --filter api start`
- The Hono app serves static files for `/*` and API routes under `/api/*`
- Railway provides automatic HTTPS, custom domain support (`vk.vas3k.club` CNAME → Railway)
- Environment variables: `DATABASE_URL`, `OIDC_CLIENT_ID`, `OIDC_ISSUER`

### NFC Flow

NFC chips contain standard NDEF URI records — **no Web NFC API needed** (it's Chrome-Android only). The OS handles everything:

1. Each chip is pre-programmed with: `https://vk.vas3k.club/{username}`
2. **Android**: user taps chip → URL opens in installed PWA (Chrome 139+) or browser
3. **iOS**: user taps chip → URL opens in Safari → PWA loads as webpage (degraded but functional)
4. PWA identifies the target user from the URL and shows their profile

**Questions to ask the vas3k.club developer (Вастрик):**
1. Can we use the subdomain `vk.vas3k.club`? What DNS setup is needed (CNAME to Railway)?
2. OIDC: what claims/scopes are returned? (slug, display_name, avatar_url, bio?) — reference: https://vas3k.club/post/openid
3. ~~Is there an API endpoint to get the list of camp participants?~~ → Participant list will be provided as text after ticket sales close (~10 March).
4. ~~Can we fetch a user's profile data without login?~~ → Likely not (many profiles are private). Profile data will only be available after the user logs in via OIDC. For NFC landing pages where the scanner is logged in but the target isn't: show minimal info (username only) until both are authenticated. Cached profile data from OIDC login is sufficient.
5. Are there any rate limits on OIDC / API endpoints?
6. Are there any existing usernames that equal `witness`, `contacts`, `leaderboard`, `login`, or `callback`? (Route `admin` is already reserved and won't clash — see below.)
7. ~~Webhook for profile updates?~~ → Not needed. Cache profile once at login, don't refresh.

### Core Mechanics

**Phase 1 — Simple Contact Log (MVP):**
1. A taps B's NFC chip → app opens `/{username}` → shows B's profile card
2. A taps "I met this person" → contact stored locally (IndexedDB) + syncs when online
3. B sees the meeting in their contact list too
4. Same pair limited to **1 meeting per entire camp** (one-time only). If A already met B, the page shows "Already met ✓" with date/time.
5. **Undo/Cancel**: Within the first 5 minutes after logging, either participant can cancel the meeting (hard delete — the pair can re-meet). After 5 minutes, the meeting is permanent but can be **hidden** from your contact list (soft delete — meeting still counts for stats and uniqueness).

**Phase 2 — Witness ("Proof of Vibe"):**
1. A scans B's NFC → taps "Meet" → app shows a **4-digit numeric code** on screen (valid 5 min)
2. C (nearby bystander) opens their app → Witness tab → enters the 4-digit code
3. Validation: C ≠ A, C ≠ B, C has available approvals, code hasn't expired, A-B haven't already been confirmed
4. Meeting becomes "confirmed". C spends 1 approval.
5. Unconfirmed meetings still count for contact list and basic stats, but are visually marked as unconfirmed. They can be confirmed later via re-scan + witness at any time during the camp.

**Confirmed vs Unconfirmed scoring:**
- **Leaderboard**: only **confirmed** meetings count toward the single leaderboard ranking.
- **Personal results / dashboard**: confirmed contacts listed first, then unconfirmed contacts shown separately as "unverified" (possibly fabricated).
- **No hard threshold**: unconfirmed contacts don't block you from the leaderboard. Instead, having many unconfirmed contacts earns you the "🚔 Fuck the Police" achievement (most unconfirmed contacts ratio). This turns potential abuse into a joke rather than a punishment.
- **Contact list**: both confirmed and unconfirmed are visible, with clear visual distinction (✓ checkmark vs dotted border / grey text).

**Why 4-digit numeric code (not 3)?**
- 3 digits = 1,000 combinations. With ~30 active codes at peak times, birthday-problem collision probability is **~35%**. Too risky.
- 4 digits = 10,000 combinations. With ~30 active codes, collision probability is **~4%**. Acceptable.
- Numeric-only = easy to read aloud, no ambiguity ("O" vs "0", "l" vs "1").

**Code duration — 5 minutes:**
- Shorter (2–3 min): more stressful, "hurry up and find a witness" — less fun at a chill camping event.
- Current (5 min): enough time to casually ask someone nearby. Good balance.
- Longer (10 min): more relaxed but opens screenshot-forwarding abuse.
- **Recommendation: keep 5 min.** Can be tuned via admin config if needed during the camp.

**Anti-abuse measures:**
- Code expires in 5 min (proves temporal proximity — C must be near A's screen)
- C ≠ A, C ≠ B (server-side + client-side check)
- Each pair can only be confirmed once per camp
- Approvals are finite (see economy below)
- No minimum cooldown between meetings for MVP — the witness mechanic + finite approvals already gate speed. If speed-running becomes an issue during camp, can add a 3-min cooldown via admin config.

**Offline code freshness:**
- Code is generated client-side with `created_at` and `expires_at` timestamps
- Witness confirmation stores its own `confirmed_at` (client timestamp)
- When both records sync, server checks: C's `confirmed_at` < A's `expires_at` + 1 min grace period
- **All timestamps are stored in UTC** (`Date.now()` / `new Date().toISOString()`). This avoids timezone issues — campers arriving from different timezones will have phones set to various local times, but UTC is universal. The 5-min window comparison is always UTC-to-UTC, so device timezone settings don't matter.
- Pragmatic choice: for a fun camp activity among friends, strict cryptographic time-proofing isn't needed. Trust client timestamps.

---

### Approval Economy

**Starting state:** Each participant gets **3 approvals** at the start.

**Replenishment:** +1 approval for every **2 confirmed contacts** (as a meeting participant, not as a witness).

**Admin controls:**
- Admins can grant N approvals to **a specific user** (individual boost)
- Admins can grant N approvals to **ALL users at once** (global boost — useful for kickstarting activity on day 2+)

**Math / sustainability analysis:**

```
Total starting pool: 170 × 3 = 510 approvals

Per confirmed meeting:
  - Witness (C): spends 1 approval  → -1
  - Initiator (A): +0 immediately, +1 when reaching 2nd, 4th, 6th... contact
  - Target (B): same as A
  - Average net per meeting: -1 + 0.5 + 0.5 = 0 (system is roughly NEUTRAL)

Scenario: 100 active participants over 3 days
  Day 1: ~200 meetings. 200 approvals consumed, ~200 generated. Pool ≈ 510.
  Day 2: ~150 meetings. Balanced. Pool ≈ 510.
  Day 3: ~100 meetings. Activity naturally slows. Pool still ≈ 510.

Inactive participants: ~50 people × 3 = 150 approvals never used.
  Active pool: 360 approvals for 120 active people = 3 each.
  Still viable — you can witness 3 pairs on day 1, earn more by meeting people.

Can it stall? Only if ALL remaining approval-holders refuse to witness.
  Mitigated by: (1) admin bulk grants, (2) active socializers earn and spend naturally.

Stalling risk: LOW. The neutral economy won't hyperinflate but also won't run dry.
```

**Caps:** No hard cap on max approvals. Natural limit from meeting frequency.

### Offline-First Strategy

- All actions → IndexedDB first, then sync queue
- `online` event fires → replay queued actions to `/api/*` endpoints
- iOS has no Background Sync API → use `online` event + periodic poll when app is open
- **Conflict resolution**: Meetings are **append-only** (create-only, no edits except status transitions) — this eliminates most conflict scenarios. Cancel/hide are separate operations with clear precedence (cancel wins over hide). For user profile data: last-write-wins with `updated_at` timestamps. This is simple and good enough — profile data originates from vas3k.club anyway and rarely conflicts.
- Offline witness: code generated client-side, both parties' records sync and reconcile server-side. Server matches witness code to pending meeting and validates timestamps with 1-min grace period.
- **Sync priority**: meeting creation > witness confirmation > cancel/hide > profile updates

### Data Model (PostgreSQL on Railway, managed via Drizzle ORM)

**users**:
- `username` (PK, text) — vas3k.club slug
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text, nullable)
- `approvals_available` (int, default **3**)
- `confirmed_contacts_count` (int, default 0) — cached counter for approval replenishment logic
- `is_admin` (boolean, default false)
- `created_at` (timestamptz)

**meetings**:
- `id` (uuid, PK)
- `initiator_username` (FK → users)
- `target_username` (FK → users)
- `witness_code` (text, 4-digit numeric, nullable)
- `witness_code_expires_at` (timestamptz, nullable)
- `witness_username` (FK → users, nullable)
- `status` (enum: `'pending'` | `'unconfirmed'` | `'confirmed'` | `'cancelled'`)
- `hidden_by` (text[], nullable) — array of usernames who hid this from their list
- `created_at` (timestamptz)
- `confirmed_at` (timestamptz, nullable)
- `cancelled_at` (timestamptz, nullable)
- `client_created_at` (timestamptz) — for offline-created meetings

**approval_grants** (admin log):
- `id` (uuid, PK)
- `granted_by` (FK → users)
- `granted_to` (text — username or `'__all__'` for bulk grants)
- `amount` (int)
- `created_at` (timestamptz)

**sync_queue** (client-side IndexedDB only):
- `id` (auto)
- `action` (text: `'create_meeting'` | `'witness_meeting'` | `'cancel_meeting'` | `'hide_meeting'`)
- `payload` (JSON)
- `created_at` (timestamp)
- `synced` (boolean)

**Authorization (enforced in Hono middleware, not DB-level RLS):**
- Users can read all meetings (leaderboard needs aggregated data)
- Users can only create meetings where they are the initiator
- Users can only witness meetings where they are neither initiator nor target
- Users can cancel meetings where they are initiator or target (within 5 min of creation)
- Users can hide meetings where they are initiator or target
- Admins can update any user's approval count and create approval_grants

**Unique constraint:** `(initiator_username, target_username)` where `status != 'cancelled'` — enforces one meeting per pair per camp. Applied as a partial unique index covering both directions (A→B and B→A).

### Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard: stats, recent contacts, approval count |
| `/:username` | **Dual-purpose**: if username ≠ you → NFC landing (show profile + "Meet" button); if username = you → your public profile |
| `/witness` | Enter witness code |
| `/contacts` | Full contact list with filter (confirmed/unconfirmed, hidden toggle) |
| `/leaderboard` | Single ranking by confirmed meetings (anonymized, top 10–20 visible) |
| `/admin` | Approval grants (individual + bulk), event config, event stats |
| `/login` | Auth flow entry |
| `/callback` | OIDC callback |

**Routing note:** Static routes (`/witness`, `/contacts`, `/leaderboard`, `/admin`, `/login`, `/callback`) are defined first in the router. `/:username` is a catch-all dynamic route. Username `admin` is reserved (ask Вастрик to confirm no club member has this slug). Other static route names (`witness`, `contacts`, etc.) should also be checked.

### Features by Phase

**Phase 1 — MVP** (target: mid-May for testing):
- Project scaffold: Bun monorepo (`apps/web`, `apps/api`, `packages/shared`)
- Railway Postgres setup (Drizzle schema, migrations, partial unique indexes)
- Hono API: meeting CRUD, user sync, auth middleware
- Auth (OIDC with vas3k.club, or fallback tokens — TBD with team)
- NFC landing page (`/:username`), meeting logging
- Dashboard + contact list
- Meeting cancel (within 5 min) + hide
- IndexedDB sync queue + online/offline sync
- Basic leaderboard (confirmed meeting count, anonymized top 10–20)

**Phase 2 — Witness** (target: late May, before camp):
- 4-digit witness code generation + display UI
- Witness entry page (`/witness`)
- Approval economy (balance tracking, +1 per 2 contacts replenishment)
- Admin panel: individual grants, bulk grants to all users, event config (start/end dates, cooldown toggle)
- Offline witness reconciliation logic

**Phase 3 — Polish** (during or after camp):
- Achievement system (extensible badge definitions + server-side queries)
- Timeline / results page per participant (shareable as image export)
- Network graph visualization
- Post-camp mode: app remains accessible as a memento with read-only stats

### UI/UX Notes

- Design borrowed from vas3k.club / vas3k.blog aesthetic (clean, minimal, good typography)
- Mobile-first (95%+ phone usage)
- Performance budget: < 100KB JS gzipped initial load
- Offline indicator banner with "N actions pending sync"
- Language: **Russian**
- If user scans NFC while not logged in → show profile + "Log in to record" CTA → store target username, redirect back after auth

### Leaderboard Design

**Single leaderboard** — ranked by **confirmed meetings count**.

- **Public but anonymized**: all users can view, but entries show avatars/names only for the **top 10–20** participants
- Remaining entries are anonymized ("Участник #42") — you can only see your own position
- Leaderboard shows **ranks/places only**, not raw contact counts (avoids "X has 47 contacts" comparison)
- This limits incentive for excessive grinding (no glory beyond top 20) while not pressuring introverts
- Each user sees their own rank and stats regardless of anonymization
- Only confirmed meetings count toward rank

### Achievements (separate from leaderboard)

Achievements are **badges** awarded based on specific behavior patterns. They are independent of the leaderboard. The list will grow over time — initial set below, more to be added.

| Achievement | Criteria | Vibe |
|---|---|---|
| 🤖 **Просто машина** | Most confirmed meetings | Active networker |
| 🤖 **Непросто машина** | Most total meetings (confirmed + unconfirmed) | Active networker |
| 🧨 **Анархист** | Most unconfirmed meetings | Rule breaker |
| 💍 **Сваха** | Most witness confirmations given | Helpful community member |
| 🌙 **Ночная сова** | Most meetings 00:00–10:00 (camp local time) | Late-night socializer |
| 🌅 **Утренняя сова** | Most meetings 06:00–16:00 (camp local time) | Early riser |
| 🐢 **На чилле** | Longest average gap between consecutive meetings | Quality over quantity |
| ⚡ **Есть пробитие** | First confirmed meeting of the camp | Pioneer |

Note: time-based achievements use **camp local time (Serbia, UTC+2)**. Computed server-side from UTC timestamps.

Achievements are displayed on the user's profile/dashboard. Can be single-winner ("Есть пробитие") or top-N. The system is designed to be easily extensible — adding a new achievement = adding a query + badge definition.

---

### Event Configuration (Admin)

- **Event start/end**: Static dates set in admin panel. Activity only works within this window (meeting creation disabled outside). Admin can adjust start/end during the camp if needed.
- **Camp timezone**: Europe/Belgrade (UTC+2). All time-based achievements use this timezone.
- **Post-camp mode**: After the event ends, the app switches to read-only. Participants can still access their dashboards, contact lists, and stats as a memento. New meetings cannot be created. Dashboard stats can be **exported as an image** (screenshot-ready card).

---

### Resolved Questions

1. ✅ **Domain**: `vk.vas3k.club` — subdomain of the club. Need to confirm DNS setup with Вастрик.
2. ✅ **OIDC**: reference at https://vas3k.club/post/openid. Detailed questions listed in NFC Flow section above.
3. ✅ **NFC chip programming**: Handled by the team (not the developer).
4. ⏳ **Auth preference**: OIDC vs pre-generated tokens — **TBD, asking the team**.
5. ✅ **Meeting uniqueness**: One confirmed meeting per pair **per entire camp** (one-time only).
6. ✅ **Leaderboard**: Public, anonymized beyond top 10–20. Shows ranks only (not raw counts). Each user sees their own rank.
7. ✅ **Unconfirmed meetings**: Count for contact list and personal stats. Only confirmed count for leaderboard. No hard threshold — high unconfirmed ratio earns "🚔 Fuck the Police" achievement instead.
8. ✅ **Profile data caching**: Cache once at OIDC login. No refresh needed.
9. ✅ **Admin team**: You + 3–5 other participants. Admin flag set in DB.
10. ✅ **NFC chip math**: 200 production chips for 170 people = 30 spares. Fine.
11. ✅ **Camp schedule**: Static start/end dates, adjustable by admin during event.
12. ✅ **Data retention**: App stays accessible post-camp as a read-only memento. Stats dashboards exportable as images.
13. ✅ **Profile API access**: Most profiles are private — profile data only available after user logs in via OIDC. Cached locally.
14. ✅ **Route `admin`**: Reserved for admin panel. Need to confirm no club member has `admin` as username.

### Remaining Open Questions

1. ⏳ **OIDC vs tokens** — awaiting team input. Impacts first-login flow and offline behavior.
2. ⏳ **Participant list** — will be provided as text after ticket sales close (~10 March). Needed for pre-seeding the users table.
3. **Username collision check** — ask Вастрик: does any club member have a username matching `witness`, `contacts`, `leaderboard`, `admin`, `login`, or `callback`?