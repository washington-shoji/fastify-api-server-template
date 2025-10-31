# Architecture

This template follows a layered architecture with Fastify's plugin system for cross-cutting concerns.

## Overview

- `src/server.ts` builds the Fastify app, registers plugins and routes, and starts the server.
- `src/env.ts` loads and validates environment variables using Zod.
- `src/db/` contains Drizzle ORM setup, schemas, and migration runner.
- `src/plugins/db.ts` decorates the app with a Drizzle database instance.
- `src/plugins/jwt.ts` registers `@fastify/jwt`, adds an `authenticate` guard, and token helpers.
- `src/routes/*` defines feature routes. Routes are thin: they wire repositories → services → controllers.
- `src/controllers/*` contain HTTP handlers; they extract request data, call services, and shape responses.
- `src/services/*` contain business logic; they orchestrate repositories and apply domain rules.
- `src/repositories/*` encapsulate data access using Drizzle ORM; they map between domain and database.
- `src/domain/*` contains domain schemas (Zod validation) and types.
- `src/types/fastify.d.ts` augments Fastify types for new decorators and `request.user`.

## Request flow

1. Incoming HTTP request → Fastify route.
2. For protected routes, `preValidation: [app.authenticate]` verifies the JWT and populates `request.user`.
3. Route calls controller handler.
4. Controller extracts data from request, validates with Zod schemas, calls service.
5. Service applies business logic, calls repository.
6. Repository uses Drizzle ORM to query database with full type safety.
7. Response flows back: Repository → Service → Controller → Route → Client.

## Database & ORM

- **Drizzle ORM**: Type-safe ORM with excellent TypeScript inference.
- **Schema definitions**: Located in `src/db/schema/` (users, todos, etc.).
- **Migrations**: Managed via Drizzle Kit (`npm run db:generate` to generate, `npm run db:migrate` to apply).
- **Connection**: Single Pool managed in `src/db/index.ts`, exposed via `app.db` (Drizzle instance).
- **IDs**: UUIDv7 (time-ordered) generated at application level for better performance.

## JWT strategy

- **Access token**: Short-lived, default `ACCESS_TOKEN_TTL=15m`.
- **Refresh token**: Longer-lived, default `REFRESH_TOKEN_TTL=7d`.
- **Cookies**: `access_token` and `refresh_token` are set as httpOnly by default for convenience.
- **User binding**: User ID extracted from JWT `sub` claim, used to scope all data operations.

## Data access pattern

**Repository Pattern:**

- Repositories use Drizzle ORM for type-safe queries.
- All queries are parameterized (SQL injection safe).
- Repositories map between Drizzle schema types and domain types.
- User-scoped queries automatically filter by `user_id`.

**Example:**

```typescript
// Repository uses Drizzle
await app.db
	.select()
	.from(todos)
	.where(and(eq(todos.id, id), eq(todos.userId, userId)));
```

## TypeScript augmentation

- `src/types/fastify.d.ts` adds types for:
  - `app.db` (Drizzle instance)
  - `app.authenticate`, `app.signAccessToken`, `app.signRefreshToken`, `app.verifyRefreshToken`
  - `request.user`

Adjust these as you add more decorators.

## Layer responsibilities

- **Routes**: Register endpoints, wire dependencies, apply middleware.
- **Controllers**: HTTP concerns (request/response, status codes, validation errors).
- **Services**: Business logic, orchestration, domain rules.
- **Repositories**: Data access, Drizzle queries, database mapping.
- **Domain**: Pure domain models and validation schemas (Zod).
