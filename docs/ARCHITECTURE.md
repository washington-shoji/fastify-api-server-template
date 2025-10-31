# Architecture

This template follows Fastify's plugin architecture to keep concerns isolated and testable.

## Overview

- `src/server.ts` builds the Fastify app, registers plugins and routes, and starts the server.
- `src/env.ts` loads and validates environment variables using Zod.
- `src/plugins/db.ts` decorates the app with a PostgreSQL `Pool`.
- `src/plugins/jwt.ts` registers `@fastify/jwt`, adds an `authenticate` guard, and token helpers.
- `src/routes/*` defines feature routes (e.g., `health`, `auth`). Routes are thin: they bind HTTP to controllers.
- `src/controllers/*` expose handlers; they orchestrate services and shape HTTP responses.
- `src/services/*` contain business logic; they call repositories and utilities.
- `src/repositories/*` encapsulate data access; they use `app.db`.
- `src/types/fastify.d.ts` augments Fastify types for new decorators and `request.user`.

## Request flow

1. Incoming request → Fastify route.
2. For protected routes, `preValidation: [app.authenticate]` verifies the JWT.
3. Handlers can access `request.user` (from JWT) and `app.db` (pg `Pool`).
4. Replies may set cookies and return JSON.

## JWT strategy

- Access token: short-lived, default `ACCESS_TOKEN_TTL=15m`.
- Refresh token: longer-lived, default `REFRESH_TOKEN_TTL=7d`.
- Cookies: `access_token` and `refresh_token` are set as httpOnly by default for convenience; you can switch to header-only tokens.

## Database

- `db.ts` creates a `Pool` from `DATABASE_URL` and runs a startup probe (`SELECT 1`).
- The `Pool` is exposed as `app.db` and terminated gracefully on server close.

## TypeScript augmentation

- `src/types/fastify.d.ts` adds types for:
  - `app.db`, `app.authenticate`, `app.signAccessToken`, `app.signRefreshToken`, `app.verifyRefreshToken`
  - `request.user`

Adjust these as you add more decorators.
