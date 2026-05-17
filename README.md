# ВКлубе (VKlube) — NFC Networking PWA for Vas3k.Camp

Геймифицированное приложение для знакомств на кэмпе с NFC-чипами.

**Прод:** https://vk.vas3k.cloud  
**Статус:** MVP задеплоен, работает. Witness-механика (Phase 2) в разработке.  
**Кэмп:** начало июня 2026, 4 дня.

## Стек

- **Monorepo**: Bun workspaces
- **Frontend**: React 19 + Vite + Zustand (PWA, offline-first)
- **Backend**: Hono on Bun runtime
- **Database**: PostgreSQL + Drizzle ORM
- **Deploy**: Railway (single service)

## Быстрый старт

```bash
# 1. Установить Bun (если нет)
curl -fsSL https://bun.sh/install | bash

# 2. Установить зависимости
bun install

# 3. Запустить базу данных
docker compose up -d

# 4. Скопировать .env
cp .env.example .env

# 5. Применить миграции
bun run db:migrate

# 6. Запустить API (порт 3000)
bun run dev:api

# 7. В другом терминале — запустить фронтенд (порт 5173)
bun run dev:web
```

## Структура

```
├── packages/shared/    # Общие типы, константы
├── apps/
│   ├── api/            # Hono API (Bun runtime)
│   └── web/            # React 19 PWA (Vite)
├── drizzle/            # Миграции БД
└── docs/               # Документация и планы
```

## Dev-режим авторизации

Для разработки без настроенного OIDC — установите `DEV_USER=username` в `.env`. Это позволит работать от имени любого пользователя без авторизации через vas3k.club.

> ⚠️ В production (NODE_ENV=production) DEV_USER игнорируется — работает только OIDC через vas3k.club.

## Деплой

Проект деплоится на Railway как один сервис. Hono отдаёт статику фронтенда из `apps/web/dist/` и API на `/api/*`.

Env vars для Railway:
- `DATABASE_URL` — PostgreSQL connection string
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` — vas3k.club OIDC
- `NODE_ENV=production`
