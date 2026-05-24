# Known Issues

Актуальные баги и проблемы. Формат: дата, описание, статус.

---

### Operational — перед запуском в кэмпе
- [x] **NFC-чипы**: физические чипы должны быть перепрошиты на URL вида `https://<host>/<camp_username>` (а не `/<club_slug>`). Список соответствий slug → camp_username получить запросом `SELECT username, camp_username FROM users WHERE camp_username IS NOT NULL`.
- [ ] **Backfill**: выполнить `bun run apps/api/src/scripts/backfill-camp-usernames.ts` в окружении после применения миграции `0002_smooth_adam_warlock.sql`.
- [ ] **IndexedDB v2**: при первом открытии PWA после деплоя клиентский кэш встреч/юзеров будет сброшен (схема несовместима). Очередь `syncQueue` также теряется — приемлемо до launch.

## Архив (исправлено)

### 2026-05-13
- [x] Android: Firefox&Chrome: installed PWA cannot change routes without internet
- [x] Стартовый экран «Главная», но при переходах на Контакты, Рейтинг появляется логин-скрин и не видно навигации
- [x] Не работает вход через dev-режим с любым username (testuser, alice, m0rtyn...), выводит ошибку входа