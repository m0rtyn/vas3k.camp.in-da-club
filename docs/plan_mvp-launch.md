## Plan: MVP Launch — VKlube Prototype

Приложение на ~80% готово. Frontend полностью реализован, backend работает кроме OIDC-авторизации. Для запуска завтра нужно: реализовать OIDC callback, исправить 3 критических бага, убрать witness из навигации, задеплоить на Railway.

**Scope**: Phase 1 MVP — NFC сканирование, логирование встреч, лидерборд, админка, offline-sync.  
**Исключено**: Witness-механика, достижения, таймлайн.

---

### Phase A: OIDC Auth (критический путь) — DONE

1. [x] A1.** Реализовать `GET /api/auth/login` — ✅ redirect на `{issuer}/auth/openid/authorize` с корректными params
2. [x] **A2.** Реализовать `GET /api/auth/callback` — ✅ exchange code → fetch profile `/user/me.json` → upsert в БД → session cookie → redirect `/callback?token=`
3. [x] **A3.** Реализовать `POST /api/auth/logout` — ✅ `deleteCookie` через `hono/cookie`
4. [x] **A4.** Проверить auth middleware — ✅ заменён ручной парсинг cookie на `getCookie` из `hono/cookie`, DEV_USER блокируется в production

**Подзадачи (выполнены):**
- Обновлён `CallbackPage.tsx` — читает `?token=` из URL, сохраняет в localStorage
- Обновлён `fetchMe()` в auth store — всегда пробует `/api/auth/me` (не зависит только от localStorage)
- Нужен env var `OIDC_CLIENT_SECRET` (добавлен в callback flow)
- Эндпоинты vas3k.club: `/auth/openid/authorize`, `/auth/openid/token`, `/user/me.json` (из [официального гайда](https://vas3k.club/post/openid))

---

### Phase B: Критические баги (*параллельно с A*)

5. **B1.** Fix пустой `initiator_username` при offline-создании встречи — meetings.ts
6. **B2.** Fix `witness_meeting` ломает весь sync batch — sync.ts — не бросать exception, вернуть ошибку на уровне action
7. **B3.** Добавить React Error Boundary — App.tsx

---

### Phase C: UI cleanup (*параллельно с A и B, тривиально*)

8. **C1.** Убрать пункт "Witness" из bottom nav — Layout.tsx

---

### Phase D: Railway Deploy (*после A + B*)

9. **D1.** Проверить Dockerfile и railway.json — build/start команды
10. **D2.** Настроить env vars в Railway: `DATABASE_URL`, `OIDC_*`, `NODE_ENV=production`
11. **D3.** Применить миграции на prod БД

---

### Phase E: Smoke-test (*после D*)

12. **E1.** Локально: dev login → Dashboard → Meet → Contacts → Cancel/Hide → Leaderboard → Offline sync
13. **E2.** Prod: OIDC login → тот же flow → PWA install

---

### Verification

1. Dev login flow работает end-to-end
2. Offline queue replay — создать встречу offline, sync при reconnect
3. OIDC flow — redirect → callback → session → `/api/auth/me` возвращает user
4. `GET /api/health` отвечает 200 на Railway
5. PWA устанавливается и работает offline

---

### Decisions

- Witness полностью вырезан (Phase 2)
- Meetings = `unconfirmed` по умолчанию (без witness нет `confirmed` статуса)
- DEV_USER блокируется в production через `NODE_ENV`
- NFC-чипы готовы, фоллбэк не нужен

---

### Further Considerations

1. **OIDC credentials** — уже есть `client_id`/`client_secret` от vas3k.club, или нужно запрашивать?
2. **Домен** — какой домен будет на Railway? Нужен для `OIDC_REDIRECT_URI` и NFC-ссылок на чипах.