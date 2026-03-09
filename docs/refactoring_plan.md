# План рефакторинга прототипа ВКлубе

Статус: прототип Phase 1 (MVP) — базовая структура, dev-авторизация, CRUD встреч, offline-first каркас. OIDC и Witness не реализованы. Ниже — план приведения кодовой базы в состояние, пригодное для продакшн-разработки.

---

## 0. Обзор текущих проблем

### Критические (блокеры)
| # | Проблема | Файл | Суть |
|---|----------|------|------|
| C1 | Пустой `initiator_username` при офлайн-создании встречи | `apps/web/src/store/meetings.ts` | Оптимистичная встреча создаётся с `initiator_username: ''`, т.к. auth store не подключён |
| C2 | OIDC callback — заглушка | `apps/api/src/routes/auth.ts` | 4 TODO, обмен code→token/upsert не реализованы |
| C3 | `witness_meeting` бросает ошибку в sync | `apps/api/src/routes/sync.ts` | Если клиент отправит witness-действие — весь batch ломается |
| C4 | Нет React Error Boundary | `apps/web/src/` | Любая ошибка в компоненте крашит всё приложение |

### Высокий приоритет
| # | Проблема | Файл |
|---|----------|------|
| H1 | `AuthGuard` делает `window.location.href` вместо роутерной навигации | `AuthGuard.tsx` |
| H2 | DEV_USER bypass доступен если env var случайно попал в прод | `middleware/auth.ts` |
| H3 | Парсинг cookie вручную строковым сплитом | `middleware/auth.ts` |
| H4 | Нет валидации `amount > 0` в admin grants (исправлено — уже есть проверка) | `routes/admin.ts` |
| H5 | Приведение типов через `unknown` в leaderboard | `routes/leaderboard.ts` |
| H6 | `logout` в Layout делает полный page reload | `Layout.tsx` |

### Средний приоритет
| # | Проблема |
|---|----------|
| M1 | Sync-ошибки глотаются молча (catch без логирования) |
| M2 | Нет backoff/retry при ошибках синхронизации |
| M3 | Нет индексов на FK-столбцах и `created_at` в БД |
| M4 | ProfilePage вызывает `fetchMeetings()` при каждом изменении username |
| M5 | Дублирование static file serving в Hono |
| M6 | Leaderboard использует raw SQL вместо Drizzle query builder |
| M7 | `hide`/`unhide` в store используют хардкод `'self'` вместо реального username |

---

## 1. Архитектурные улучшения

### 1.1 Типизация и контракты API

**Что:** Создать единый пакет типов для API-запросов и ответов в `packages/shared`.

**Зачем:** Сейчас типы запросов определяются inline через `c.req.json<{...}>()`, а ответы не типизированы на клиенте. Это приводит к дрифту между клиентом и сервером.

**Как:**
- Добавить в `packages/shared/src/types.ts` типы для каждого API-эндпоинта:
  ```
  // Request types
  CreateMeetingRequest { target_username, client_created_at }
  GrantApprovalsRequest { username, amount }
  DevLoginRequest { username, display_name? }
  SyncRequest { items: SyncItem[] }
  
  // Response types
  SyncResponse { results: SyncResult[] }
  AdminStatsResponse { total_users, confirmed_meetings, ... }
  LeaderboardResponse = LeaderboardEntry[]
  ```
- Импортировать эти типы и в API, и в клиенте
- Удалить inline-определения типов из route-хэндлеров

**Файлы:**
- `packages/shared/src/types.ts` — добавить типы
- `apps/api/src/routes/*.ts` — использовать shared-типы
- `apps/web/src/lib/api.ts` — типизировать generic-вызовы

### 1.2 Единая обработка ошибок на сервере

**Что:** Добавить Hono error handler + стандартный формат ошибок.

**Зачем:** Сейчас каждый route вручную формирует `{ error, message }`, нет обработки непредвиденных ошибок (500 молча).

**Как:**
- Создать `apps/api/src/middleware/error.ts`:
  ```ts
  // Класс AppError с code + statusCode
  // Глобальный onError handler для Hono
  // Логирование ошибок (console.error на старте, можно расширить)
  ```
- В `index.ts` подключить `app.onError(errorHandler)`
- Заменить `c.json({ error: '...', message: '...' }, 4xx)` на `throw new AppError(...)`

**Файлы:**
- Создать: `apps/api/src/middleware/error.ts`
- Изменить: `apps/api/src/index.ts`, все `routes/*.ts`

### 1.3 Валидация входных данных

**Что:** Добавить schema-валидацию для всех API-эндпоинтов.

**Зачем:** Сейчас валидация минимальна и ручная (проверки `if (!field)`). Нет защиты от невалидных типов, XSS в строках, слишком длинных значений.

**Как:**
- Использовать `zod` (или `valibot` для меньшего бандла) — обе библиотеки хорошо интегрируются с Hono через `@hono/zod-validator`
- Определить схемы в `packages/shared/src/schemas.ts`
- Применить middleware валидации в route-хэндлерах

**Файлы:**
- Создать: `packages/shared/src/schemas.ts`
- Изменить: `packages/shared/src/index.ts` (реэкспорт)
- Изменить: `apps/api/src/routes/*.ts` (подключить валидатор)
- `package.json` — добавить `zod` или `valibot`

---

## 2. Исправление критических багов

### 2.1 Пустой `initiator_username` при офлайн-создании (C1)

**Проблема:** В `apps/web/src/store/meetings.ts:62` оптимистичная встреча создаётся с `initiator_username: ''`.

**Решение:**
```ts
// meetings.ts — createMeeting
createMeeting: async (targetUsername: string) => {
  const currentUser = useAuthStore.getState().user;
  if (!currentUser) throw new Error('Not authenticated');
  
  const localMeeting: Meeting = {
    // ...
    initiator_username: currentUser.username, // вместо ''
    // ...
  };
```

**Файлы:** `apps/web/src/store/meetings.ts`

### 2.2 React Error Boundary (C4)

**Что:** Обернуть приложение в Error Boundary для graceful degradation.

**Как:**
- Создать `apps/web/src/components/ErrorBoundary.tsx` (class component с `componentDidCatch`)
- Обернуть `<Routes>` в `App.tsx`
- Показывать пользователю «Что-то пошло не так» с кнопкой «Обновить»

**Файлы:**
- Создать: `apps/web/src/components/ErrorBoundary.tsx`
- Изменить: `apps/web/src/App.tsx`

### 2.3 Хардкод `'self'` в hide/unhide (M7)

**Проблема:** В `store/meetings.ts` при `hideMeeting` в `hidden_by` добавляется строка `'self'`, а сервер использует реальный `username`. После синхронизации локальное и серверное состояние расходятся.

**Решение:** Получать username из auth store:
```ts
hideMeeting: async (meetingId: string) => {
  const currentUser = useAuthStore.getState().user;
  // ...
  m.id === meetingId ? { ...m, hidden_by: [...m.hidden_by, currentUser.username] } : m
```

**Файлы:** `apps/web/src/store/meetings.ts`

---

## 3. Авторизация

### 3.1 Реализация OIDC callback (C2)

**Что:** Полноценный OIDC flow с vas3k.club.

**Как:**
1. В `GET /api/auth/callback`:
   - Обменять `code` на access_token через POST к token endpoint
   - Получить userinfo (или декодировать id_token)
   - Upsert пользователя в БД (slug → username, full_name, avatar, bio)
   - Создать безопасный session token (crypto.randomUUID), сохранить в таблице sessions или в самом user
   - Установить httpOnly cookie `session=<token>` и редиректнуть на `/`

2. В `authMiddleware`:
   - Валидировать session token из cookie (не username как сейчас!)
   - Текущая схема dev-авторизации (username = token) — дыра в безопасности для прода

3. Добавить таблицу `sessions` (или поле `session_token` в `users`):
   ```
   sessions: id (uuid), user_username (FK), token (text unique), expires_at, created_at
   ```

**Файлы:**
- Изменить: `apps/api/src/routes/auth.ts`
- Изменить: `apps/api/src/middleware/auth.ts`
- Изменить/создать: `apps/api/src/schema.ts` (таблица sessions)
- Новая миграция Drizzle

### 3.2 Защита DEV_USER bypass (H2)

**Текущая проблема:** Если ENV `DEV_USER` установлен — авторизация обходится. Проверка `NODE_ENV !== 'production'` есть, но она неявная.

**Решение:**
```ts
// middleware/auth.ts
if (devUser && process.env.NODE_ENV === 'development') { // строгое сравнение
```
Дополнительно: в продакшн-билде убрать fallback полностью через compile-time flag.

**Файлы:** `apps/api/src/middleware/auth.ts`

### 3.3 Парсинг cookie (H3)

**Решение:** Использовать встроенный `hono/cookie`:
```ts
import { getCookie } from 'hono/cookie';
const session = getCookie(c, 'session');
```
Удалить ручную функцию `getCookie`.

**Файлы:** `apps/api/src/middleware/auth.ts`

### 3.4 AuthGuard и навигация (H1, H6)

**Проблема:** `redirectToLogin()` в `lib/auth.ts` делает `window.location.href = '/login'` — полная перезагрузка страницы, потеря состояния.

**Решение:** Использовать `useNavigate()` из react-router:
```tsx
// AuthGuard.tsx
const navigate = useNavigate();
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    navigate('/login', { state: { returnTo: location.pathname } });
  }
}, [isLoading, isAuthenticated]);
```
Аналогично в `Layout.tsx` для logout.

**Файлы:**
- `apps/web/src/components/AuthGuard.tsx`
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/lib/auth.ts` (упростить `redirectToLogin`)

---

## 4. Offline-синхронизация

### 4.1 Обработка ошибок sync (M1)

**Проблема:** В `lib/sync.ts:39` ошибки глотаются пустым catch. Пользователь не знает, что синхронизация сломана.

**Решение:**
- Логировать ошибки: `console.error('Sync failed:', err)`
- Обновлять Zustand sync store: добавить `lastSyncError: string | null`
- Показывать в OfflineBanner: «Ошибка синхронизации» с кнопкой «Повторить»

**Файлы:**
- `apps/web/src/lib/sync.ts`
- `apps/web/src/store/sync.ts`
- `apps/web/src/components/OfflineBanner.tsx`

### 4.2 Exponential backoff (M2)

**Что:** При ошибке sync — увеличивать интервал повтора (30s → 60s → 120s → max 5min).

**Как:**
```ts
let backoffMs = 30_000;
const MAX_BACKOFF = 5 * 60_000;

// В catch:
backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);

// В success:
backoffMs = 30_000; // reset
```

**Файлы:** `apps/web/src/lib/sync.ts`

### 4.3 Устойчивость batch sync к частичным ошибкам (C3)

**Проблема:** Если один item в batch — `witness_meeting` — весь sync ломается.

**Решение на клиенте:** При получении `results` — помечать synced только успешные. Неуспешные оставлять в очереди, но добавить поле `retry_count` и `last_error` в sync queue. После 5 неудачных попыток — помечать как `failed` и уведомлять пользователя.

**Решение на сервере:** `witness_meeting` не должен бросать ошибку — вернуть `{ success: false, error: 'not_implemented' }` (уже так работает через try/catch, но стоит явно обработать).

**Файлы:**
- `apps/web/src/lib/db.ts` (добавить retry_count, last_error в syncQueue schema)
- `apps/web/src/lib/sync.ts` (обработка partial failures)
- `apps/api/src/routes/sync.ts` (уже ок, но добавить обработку unknown actions)

---

## 5. База данных

### 5.1 Индексы (M3)

**Что:** Добавить индексы для часто используемых запросов.

**Какие:**
```sql
CREATE INDEX idx_meetings_initiator ON meetings (initiator_username);
CREATE INDEX idx_meetings_target ON meetings (target_username);
CREATE INDEX idx_meetings_status ON meetings (status);
CREATE INDEX idx_meetings_created_at ON meetings (created_at DESC);
CREATE INDEX idx_approval_grants_granted_to ON approval_grants (granted_to);
```

**Как:** Новая миграция Drizzle: `drizzle/migrations/0001_add_indexes.sql`

**Файлы:**
- `apps/api/src/schema.ts` (добавить index-определения)
- Запустить `bun drizzle-kit generate`

### 5.2 Таблица sessions (связано с 3.1)

Для production OIDC — нужна таблица сессий вместо текущей схемы «username = token».

### 5.3 Leaderboard: типизация raw SQL (H5)

**Проблема:** `result as unknown as Array<{...}>` — потеря type safety.

**Решение:** Использовать `db.execute<T>()` с типами или переписать на Drizzle subqueries:
```ts
const meetingCounts = db.$with('meeting_counts').as(
  db.select({
    username: meetings.initiator_username,
    count: sql<number>`count(*)`.as('confirmed_count'),
  })
  .from(meetings)
  .where(eq(meetings.status, 'confirmed'))
  // ...
);
```

Если raw SQL оправдан сложностью запроса — как минимум обернуть в типизированную функцию с runtime-проверкой.

**Файлы:** `apps/api/src/routes/leaderboard.ts`

---

## 6. Фронтенд

### 6.1 Устранение бесконечных перезапросов (M4)

**Проблема:** `ProfilePage` вызывает `fetchMeetings()` в `useEffect` с `[username, fetchMeetings]` в deps. `fetchMeetings` — нестабильная ссылка → бесконечный ререндер.

**Решение:** Использовать Zustand selector для стабильной ссылки или `useRef`:
```tsx
const fetchMeetings = useMeetingsStore((s) => s.fetchMeetings);
// Zustand selectors уже стабильны, но стоит проверить.
// Альтернатива: вынести fetch из useEffect deps.
useEffect(() => {
  fetchMeetings();
}, [username]); // fetchMeetings убрать из deps
```

**Файлы:** `apps/web/src/pages/ProfilePage.tsx`

### 6.2 Защита от double-tap на Meet кнопке

**Проблема:** Быстрый двойной тап может создать дубликат встречи локально (хотя сервер вернёт conflict).

**Решение:** Добавить `isSubmitting` state в MeetButton:
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
// + disabled={isSubmitting} на кнопке
```

**Файлы:** `apps/web/src/components/MeetButton.tsx`

### 6.3 Удалить лишний `<Outlet />` из DashboardPage

**Проблема:** `DashboardPage` не является layout-роутом, но может содержать `<Outlet />` (проверить).

**Файлы:** `apps/web/src/pages/DashboardPage.tsx`

### 6.4 Admin-страница: проверка существования пользователя

**Проблема:** Можно выдать апрувы несуществующему username — сервер выполнит UPDATE, но 0 rows affected.

**Решение:** Сервер уже возвращает 404 если user not found. На клиенте — показывать эту ошибку пользователю (сейчас ошибки могут не обрабатываться).

**Файлы:** `apps/web/src/pages/AdminPage.tsx`

---

## 7. Серверная часть

### 7.1 Дублирование static serving (M5)

**Проблема:** В `index.ts` два одинаковых `app.use('/*', serveStatic(...))`.

**Решение:** Убрать дубликат, оставить один с SPA fallback:
```ts
app.use('/*', serveStatic({ root: '../web/dist' }));
app.get('*', (c) => {
  // SPA fallback
  return c.html(Bun.file('../web/dist/index.html'));
});
```

**Файлы:** `apps/api/src/index.ts`

### 7.2 CORS для production

**Проблема:** CORS настроен только для localhost. В проде нужна реальная origin.

**Решение:**
```ts
app.use('/api/*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
```

**Файлы:** `apps/api/src/index.ts`

### 7.3 Rate limiting

**Что:** Добавить базовый rate limiter на критичные эндпоинты.

**Зачем:** Защита от спама создания встреч и brute-force witness кодов (когда будет реализован).

**Как:** Использовать in-memory rate limiter (для одного инстанса Railway достаточно):
- `/api/meetings POST` — 10 req/min per user
- `/api/auth/login` — 5 req/min per IP
- `/api/sync POST` — 5 req/min per user

**Файлы:**
- Создать: `apps/api/src/middleware/rateLimit.ts`
- Изменить: `apps/api/src/index.ts`

---

## 8. Подготовка к Phase 2 (Witness)

### 8.1 Генерация witness-кода

**Что нужно:**
- API-эндпоинт `POST /api/meetings/:id/generate-code` — генерирует 4-значный цифровой код, сохраняет `witness_code` + `witness_code_expires_at` (now + 5 min)
- Клиентская генерация того же кода для офлайна
- API-эндпоинт `POST /api/witness` — принимает код, находит matching meeting, валидирует (C ≠ A, C ≠ B, не истёк, есть approvals), подтверждает встречу

### 8.2 Approval economy

**Что нужно:**
- Логика пополнения: при подтверждении встречи → инкремент `confirmed_contacts_count` у обоих участников → если кратно `CONTACTS_PER_APPROVAL` → `approvals_available += 1`
- Списание approval у witness
- Проверка `approvals_available > 0` перед подтверждением

### 8.3 UI для witness

- Страница `/witness` — поле ввода 4-значного кода + кнопка «Подтвердить»
- На странице встречи (после создания) — отображение кода с таймером обратного отсчёта
- Визуальное различие confirmed/unconfirmed в списке контактов (уже частично есть)

---

## 9. DevOps и CI

### 9.1 Environment management

**Что:** Создать `.env.example` с описанием всех переменных.

**Переменные:**
```
DATABASE_URL=
OIDC_ISSUER=https://vas3k.club
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=
CORS_ORIGIN=
NODE_ENV=development
DEV_USER=              # только для dev
PORT=3000
```

### 9.2 Healthcheck endpoint

**Что:** `GET /api/health` — проверка доступности БД, версия приложения.

**Зачем:** Railway мониторинг, быстрая диагностика проблем.

**Файлы:** `apps/api/src/index.ts` (добавить роут)

### 9.3 Линтинг и форматирование

**Что:** Настроить ESLint + Prettier для всего монорепо.

**Зачем:** Консистентный стиль кода, ловить ошибки на этапе написания.

**Как:**
- Корневой `.eslintrc` + `.prettierrc`
- `lint` и `format` скрипты в root `package.json`

---

## 10. Порядок выполнения (приоритет)

### Этап A — Критические фиксы (блокируют дальнейшую разработку)
1. **C1** — Пустой `initiator_username` + хардкод `'self'` в hidden_by (§2.1, §2.3)
2. **C4** — Error Boundary (§2.2)
3. **H1/H6** — AuthGuard и logout через роутер (§3.4)
4. **M5** — Дублирование static serving (§7.1)
5. **H3** — Cookie парсинг через hono/cookie (§3.3)

### Этап B — Архитектура (фундамент для новых фич)
6. Типизация API контрактов (§1.1)
7. Единая обработка ошибок (§1.2)
8. Валидация входных данных (§1.3)
9. Индексы БД (§5.1)

### Этап C — Авторизация для прода
10. OIDC callback + sessions (§3.1)
11. Защита DEV_USER (§3.2)
12. CORS для production (§7.2)

### Этап D — Надёжность offline
13. Ошибки и backoff в sync (§4.1, §4.2)
14. Partial failure handling (§4.3)

### Этап E — UX полировка
15. Double-tap защита (§6.2)
16. ProfilePage — убрать лишние перезапросы (§6.1)
17. Admin — обработка ошибок (§6.4)

### Этап F — Phase 2 подготовка
18. Witness code generation API (§8.1)
19. Approval economy (§8.2)
20. Witness UI (§8.3)

### Этап G — DevOps
21. `.env.example` + healthcheck (§9.1, §9.2)
22. Линтинг (§9.3)
23. Rate limiting (§7.3)
