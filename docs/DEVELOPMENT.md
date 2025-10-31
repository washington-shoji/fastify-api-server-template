# Development

## Prerequisites

- Node.js 18+
- PostgreSQL (running and accessible)
- Environment variables configured

## Initial Setup

1. **Install dependencies:**

   ```bash
   npm i
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run database migrations:**

   ```bash
   npm run db:migrate
   ```

   This applies all Drizzle migrations to your database.

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

**Required:**

- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/dbname`)
- `JWT_ACCESS_SECRET` - Secret for signing access tokens (32+ characters)
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens (32+ characters)

**Optional (with defaults):**

- `PORT=3000` - Server port
- `NODE_ENV=development` - Environment (development/test/production)
- `ACCESS_TOKEN_TTL=15m` - Access token expiration
- `REFRESH_TOKEN_TTL=7d` - Refresh token expiration
- `COOKIE_DOMAIN=localhost` - Cookie domain
- `COOKIE_SECURE=false` - Set to `true` in production (requires HTTPS)

## Database Management

### Schema Changes

1. **Edit schema files** in `src/db/schema/`:

   - `users.ts` - User table schema
   - `todos.ts` - Todo table schema

2. **Generate migration:**

   ```bash
   npm run db:generate
   ```

   This creates a new migration file in `drizzle/` folder.

3. **Apply migration:**
   ```bash
   npm run db:migrate
   ```

### Database Studio

Open Drizzle Studio to browse your database:

```bash
npm run db:studio
```

### Direct Schema Push (Dev Only)

For rapid development, push schema changes directly without migrations:

```bash
npm run db:push
```

⚠️ **Warning:** Only use in development. Use migrations for production.

## Using the API

### Authentication Flow

1. **Issue tokens:**

   ```bash
   POST /auth/token
   {
     "userId": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```

   Returns `accessToken` and `refreshToken`, also sets cookies.

2. **Use protected endpoints:**

   ```bash
   GET /todos
   Authorization: Bearer <accessToken>
   ```

   Or rely on `access_token` cookie automatically.

3. **Refresh tokens:**
   ```bash
   POST /auth/refresh
   ```
   Uses refresh token from cookie or body.

### Example: Create Todo

```bash
curl -X POST http://localhost:3000/todos \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Drizzle ORM",
    "description": "Read the documentation",
    "completed": false
  }'
```

## Adding New Features

### 1. Create Domain Schema

Create Zod schema in `src/domain/<feature>/<feature>.schema.ts`:

```typescript
export const FeatureSchema = z.object({
	id: z.string().uuid(),
	// ... fields
});
```

### 2. Create Drizzle Schema

Add schema definition in `src/db/schema/<feature>.ts`:

```typescript
export const features = pgTable('template_api_features', {
	id: uuid('id').primaryKey(),
	// ... columns
});
```

### 3. Create Repository

Implement CRUD in `src/repositories/<feature>Repository.ts`:

```typescript
export function createFeatureRepository(app: FastifyInstance) {
  return {
    async create(data: CreateFeature, userId: string) {
      // Use Drizzle ORM
      return await app.db.insert(features).values({...}).returning();
    },
    // ... other methods
  };
}
```

### 4. Create Service

Add business logic in `src/services/<feature>Service.ts`.

### 5. Create Controller

Add HTTP handlers in `src/controllers/<feature>Controller.ts`.

### 6. Create Routes

Wire everything in `src/routes/<feature>.ts` and register in `server.ts`.

### 7. Generate Migration

```bash
npm run db:generate
npm run db:migrate
```

## Testing Database Access

With Drizzle ORM:

```typescript
// In repository
const todos = await app.db.select().from(todos).where(eq(todos.userId, userId));

// Full type safety with auto-complete!
```

## Type Safety

- **Drizzle schemas** provide full TypeScript inference.
- **Domain schemas** (Zod) validate at runtime.
- **Type augmentation** in `src/types/fastify.d.ts` extends Fastify types.

When adding new decorators, update `fastify.d.ts`.

## Logging

- Fastify logger is enabled by default.
- Adjust logger options in `src/server.ts`.
- Structured logging available via Fastify's logger.

## Common Workflows

### Adding a new field to existing table

1. Update Drizzle schema in `src/db/schema/<table>.ts`
2. Update domain schema in `src/domain/<feature>/<feature>.schema.ts`
3. Generate migration: `npm run db:generate`
4. Review generated migration
5. Apply: `npm run db:migrate`
6. Update repository if needed

### User-scoped resources

All user data must be filtered by `user_id`. Repositories automatically scope queries:

```typescript
.where(and(eq(todos.id, id), eq(todos.userId, userId)))
```

This ensures users can only access their own data.
