# План рефакторинга ВКлубе

Статус: **MVP задеплоен и работает в проде** (`vk.vas3k.cloud`). OIDC-авторизация реализована. Witness-механика отключена (Phase 2). Ниже — оставшиеся задачи по улучшению кодовой базы.

---

## 0. Обзор текущих проблем

### ✅ Исправлено (архив)
| # | Проблема | Статус |
|---|----------|--------|
| C1 | Пустой `initiator_username` при офлайн-создании встречи | ✅ Исправлено |
| C2 | OIDC callback — заглушка | ✅ Полностью реализовано |
| C3 | `witness_meeting` бросает ошибку в sync | ✅ Возвращает `{ skipped: true }` |
| C4 | Нет React Error Boundary | ✅ Добавлен |
| H2 | DEV_USER bypass в проде | ✅ Защищён `NODE_ENV !== 'production'` |
| H3 | Парсинг cookie вручную | ✅ Используется `hono/cookie` |
| H4 | Нет валидации `amount > 0` в admin grants | ✅ Есть проверка |

### Высокий приоритет
| # | Проблема | Файл |
|---|----------|------|
| H1 | `AuthGuard` делает `window.location.href` вместо роутерной навигации | `AuthGuard.tsx`, `lib/auth.ts` |
| H5 | Приведение типов через `unknown` в leaderboard | `routes/leaderboard.ts` |
| H6 | `logout` в Layout делает полный page reload | `Layout.tsx` |

### Средний приоритет
| # | Проблема |
|---|----------|
| M1 | Sync-ошибки глотаются молча (catch без логирования) |
| M2 | Нет backoff/retry при ошибках синхронизации |
| M3 | Нет индексов на FK-столбцах и `created_at` в БД |
| M4 | ProfilePage вызывает `fetchMeetings()` при каждом изменении username |
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

### 1.3 Валидация входных данных (будущее)

Использовать `zod` + `@hono/zod-validator` для schema-валидации API-эндпоинтов. Отложено — не блокирует запуск.

---

## 2. Открытые баги

### 2.1 Хардкод `'self'` в hide/unhide (M7)

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

## 3. Навигация и UX

### 3.1 AuthGuard и навигация (H1, H6)

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

**Проблема:** В `lib/sync.ts` ошибки глотаются пустым catch. Пользователь не знает, что синхронизация сломана.

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

**Как:** Новая миграция Drizzle: `bun run db:generate`

**Файлы:**
- `apps/api/src/schema.ts` (добавить index-определения)

### 5.2 Leaderboard: замена raw SQL (M6, H5)

**Проблема:** `result as unknown as Array<{...}>` — потеря type safety. Используется raw SQL вместо Drizzle query builder.

**Решение:** Переписать на Drizzle subqueries или как минимум обернуть в типизированную функцию.

**Файлы:** `apps/api/src/routes/leaderboard.ts`

---

## 6. Фронтенд

### 6.1 Устранение бесконечных перезапросов (M4)

**Проблема:** `ProfilePage` вызывает `fetchMeetings()` в `useEffect` с `[username, fetchMeetings]` в deps. `fetchMeetings` — нестабильная ссылка → лишние вызовы.

**Решение:** Убрать `fetchMeetings` из deps:
```tsx
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
