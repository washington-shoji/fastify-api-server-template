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
- `npm run db:generate`: Generate Drizzle migrations from schema changes
- `npm run db:migrate`: Run migrations against database
- `npm run db:push`: Push schema changes directly (dev only)
- `npm run db:studio`: Open Drizzle Studio (database GUI)

## Environment

See `.env.example` for all variables. Required:

- `DATABASE_URL` – Postgres connection string
- `JWT_ACCESS_SECRET` – 32+ char secret
- `JWT_REFRESH_SECRET` – 32+ char secret

Optional (with sensible defaults):

- `PORT`, `NODE_ENV`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN`, `COOKIE_SECURE`

## Project structure

```text
src/
  env.ts               # Load + validate env
  server.ts            # Fastify app, plugins, routes
  db/
    index.ts           # Drizzle ORM setup
    migrate.ts          # Migration runner
    schema/
      users.ts         # User schema definition
      todos.ts         # Todo schema definition
  plugins/
    db.ts              # Drizzle DB plugin
    jwt.ts             # jwt + helpers + authenticate
  repositories/        # Data access layer
  services/            # Business logic layer
  controllers/         # HTTP handlers
  routes/              # Route definitions
  domain/              # Domain schemas (Zod validation)
  types/
    fastify.d.ts       # Type augmentation
drizzle/               # Generated migrations
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
- Run migrations: `npm run db:migrate` (first time setup)
- Generate migrations after schema changes: `npm run db:generate`
- Use `Authorization: Bearer <accessToken>` or rely on `access_token` cookie for protected routes.
- Database connection uses Drizzle ORM with full type safety.

## Deployment

- Build with `npm run build`, run with `npm start`.
- Ensure strong secrets and set `COOKIE_SECURE=true` behind HTTPS.
- Scale behind a reverse proxy; enable structured logs as needed.

## Further docs

- `docs/ARCHITECTURE.md` – deeper overview
- `docs/API.md` – endpoints and payloads
- `docs/DEVELOPMENT.md` – tips and workflows
- `docs/DEPLOYMENT.md` – deployment checklist
