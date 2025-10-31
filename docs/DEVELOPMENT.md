# Development

## Prerequisites

- Node.js 18+
- PostgreSQL (optional to start; DB plugin probes on boot)

## Setup

1. Install dependencies: `npm i`
2. Create `.env` (see README or Environment section below)
3. Start dev server: `npm run dev`

## Environment

Required variables:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Optional:
- `PORT`, `NODE_ENV`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN`, `COOKIE_SECURE`

## Using the API during development

- Issue tokens:
  - `POST /auth/token` with `{ "userId": "123", "email": "demo@example.com" }`
  - Copy `accessToken` for Authorization header, or rely on cookies
- Protected endpoint:
  - `GET /auth/me` with `Authorization: Bearer <accessToken>`
- Refresh tokens:
  - `POST /auth/refresh` with cookie or `{ "refreshToken": "..." }`

## Logging

- Fastify logger is enabled by default. Adjust logger options in `src/server.ts`.

## Testing database access

- Use `app.db` (pg `Pool`) within your routes/plugins. Example:
  - `const result = await app.db.query('SELECT NOW()')`

## Adding routes

- Create files under `src/routes/` and register them in `src/server.ts`.
- Prefer schema validation (e.g., with Zod) inside route handlers or via hooks.

## Type safety

- Extend `src/types/fastify.d.ts` when adding new decorators to the app or request.

## Common changes

- Switch cookies to `sameSite: 'strict'` or header-only tokens for SPAs.
- Disable the DB startup probe if you prefer lazy connections.
