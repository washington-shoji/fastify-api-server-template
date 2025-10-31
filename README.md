# Fastify API Template

A minimal, production-friendly Fastify starter with:

- CORS + Cookies configured
- Environment validation via Zod
- PostgreSQL pool plugin (`pg`)
- JWT auth helpers and guard (access + refresh)
- Example routes: `/health`, `/auth/*`
- Strict TypeScript + Fastify type augmentation

## Quick start

```bash
npm i
cp .env.example .env
# edit .env values
npm run dev
```

- Health check: `GET http://localhost:3000/health`
- Issue tokens: `POST http://localhost:3000/auth/token`
- Refresh token: `POST http://localhost:3000/auth/refresh`
- Protected: `GET http://localhost:3000/auth/me`

## Scripts

- `npm run dev`: Run with `ts-node-dev` (watch mode)
- `npm run build`: Compile TypeScript to `dist/`
- `npm start`: Run compiled app

## Environment

See `.env.example` for all variables. Required:

- `DATABASE_URL` – Postgres connection string
- `JWT_ACCESS_SECRET` – 32+ char secret
- `JWT_REFRESH_SECRET` – 32+ char secret

Optional (with sensible defaults):

- `PORT`, `NODE_ENV`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN`, `COOKIE_SECURE`

## Project structure

```
src/
  env.ts               # Load + validate env
  server.ts            # Fastify app, plugins, routes
  plugins/
    db.ts              # pg Pool decorator
    jwt.ts             # jwt + helpers + authenticate
  routes/
    auth.ts            # /auth endpoints
    health.ts          # /health
  types/
    fastify.d.ts       # Type augmentation
```

## Core concepts

- Plugins: Encapsulate cross-cutting concerns and decorate `app` (`db`, `authenticate`, token helpers).
- Types: `src/types/fastify.d.ts` augments Fastify instance and request so TypeScript understands decorators and `request.user`.
- Env validation: `src/env.ts` uses Zod to fail fast on invalid config.

## API overview

- `GET /health` → `{ status: "ok" }`
- `POST /auth/token` → body `{ userId: string, email?: string }` returns `{ accessToken, refreshToken }` and sets httpOnly cookies
- `POST /auth/refresh` → uses refresh token (cookie or body `{ refreshToken }`) to rotate tokens
- `GET /auth/me` → protected, returns `{ user: request.user }`

See `docs/API.md` for full request/response examples.

## Development

- Edit `.env`, run `npm run dev`.
- Use `Authorization: Bearer <accessToken>` or rely on `access_token` cookie for protected routes.
- DB pool probes on startup (`SELECT 1`) to fail fast; remove if you prefer lazy connections.

## Deployment

- Build with `npm run build`, run with `npm start`.
- Ensure strong secrets and set `COOKIE_SECURE=true` behind HTTPS.
- Scale behind a reverse proxy; enable structured logs as needed.

## Further docs

- `docs/ARCHITECTURE.md` – deeper overview
- `docs/API.md` – endpoints and payloads
- `docs/DEVELOPMENT.md` – tips and workflows
- `docs/DEPLOYMENT.md` – deployment checklist
