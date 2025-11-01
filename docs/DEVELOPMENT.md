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

### Server Configuration

- `PORT=3000` - Server port
- `HOST=0.0.0.0` - Server host
- `NODE_ENV=development` - Environment (development/test/production)

### JWT Configuration

- `ACCESS_TOKEN_TTL=15m` - Access token expiration
- `REFRESH_TOKEN_TTL=7d` - Refresh token expiration

### Cookie Configuration

- `COOKIE_DOMAIN=localhost` - Cookie domain
- `COOKIE_SECURE=false` - Set to `true` in production (requires HTTPS)

### CORS Configuration

- `CORS_ORIGIN` - Comma-separated list of allowed origins
  - If not provided: `true` in development (allows all), `[]` in production (requires explicit origins)

### Database Pool Configuration

- `DB_POOL_MIN=5` - Minimum database connections
- `DB_POOL_MAX=20` - Maximum database connections

### Rate Limiting Configuration

- `RATE_LIMIT_MAX=100` - Maximum requests per time window
- `RATE_LIMIT_TIME_WINDOW=1 minute` - Rate limit time window

### Logging Configuration

- `LOG_LEVEL=info` - Log level (fatal/error/warn/info/debug/trace)

### Query Monitoring Configuration

- `SLOW_QUERY_THRESHOLD=1000` - Slow query threshold in milliseconds

### Redis Configuration (Optional)

- `REDIS_URL` - Redis connection URL (for caching)
- `REDIS_HOST` - Redis host (if not using REDIS_URL)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_TTL` - Redis default TTL in seconds (default: 3600)

**Note:** If Redis is not configured, the application will use a no-op cache service (works without Redis).

### Server Configuration

- `TRUST_PROXY=true/false` - Trust proxy headers

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

## Testing

### Prerequisites

**Docker must be installed and running** - Tests use Testcontainers for isolated PostgreSQL containers.

### Running Tests

```bash
npm test              # Run all tests
npm run test:ui       # Run with UI
npm run test:coverage  # Run with coverage
```

### Test Structure

```
tests/
  integration/
    health.test.ts    # Health check tests
    auth.test.ts      # Authentication tests
    todo.test.ts      # Todo CRUD tests
  helpers/
    testDb.ts        # Testcontainers helper for database lifecycle
  setup.ts            # Test setup and configuration (Testcontainers integration)
```

### Testcontainers Integration

Tests use **Testcontainers** for isolated PostgreSQL containers:

- **Automatic setup**: Each test suite gets its own isolated PostgreSQL container
- **Automatic cleanup**: Containers are stopped after tests complete
- **No interference**: Tests never affect your development or production databases
- **Automatic migrations**: Drizzle migrations are run automatically on test databases
- **Database isolation**: Each test suite runs against a fresh database instance

**How it works:**

1. `tests/setup.ts` starts a PostgreSQL container before tests
2. Sets `DATABASE_URL` environment variable to the container's connection string
3. Runs Drizzle migrations on the test database
4. Tests run against the isolated database
5. Container is stopped and cleaned up after tests

### Writing Tests

Example test with Testcontainers:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';
import { resetDatabaseConnections } from '../../src/db/index.js';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';

describe('Feature Tests', () => {
	let app: FastifyInstance;
	let testDb: ReturnType<typeof createTestDb>;

	beforeAll(async () => {
		// Reset database connections to use test container
		resetDatabaseConnections();
		// Build server (DATABASE_URL already set by setup.ts)
		app = await buildServer();
		testDb = createTestDb();
	});

	beforeEach(async () => {
		// Clean database before each test for isolation
		await cleanTestDatabase();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('should test feature', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/feature',
		});

		expect(response.statusCode).toBe(200);
	});
});
```

### Test Configuration

- **Vitest** configured in `vitest.config.ts`
- **Test environment**: Node.js
- **Setup files**: `tests/setup.ts` (runs before all tests)
- **Timeouts**: 30s for tests, 60s for hooks (to accommodate Testcontainers startup)
- **Coverage**: v8 provider with HTML, JSON, and text reports
- **Test isolation**: Each test suite gets its own database container

### Database Connection Handling

The database connection pool uses **lazy initialization** to work seamlessly with Testcontainers:

- Connection pool is created on first access, not at module load time
- This allows `tests/setup.ts` to set `DATABASE_URL` before the pool is created
- `resetDatabaseConnections()` utility ensures tests use the test database URL
- See `src/db/index.ts` for implementation details

## Using the API

### Authentication Flow

1. **Issue tokens:**

   ```bash
   POST /v1/auth/token
   {
     "userId": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```

   Returns `accessToken` and `refreshToken`, also sets cookies.

2. **Use protected endpoints:**

   ```bash
   GET /v1/todos
   Authorization: Bearer <accessToken>
   ```

   Or rely on `access_token` cookie automatically.

3. **Refresh tokens:**
   ```bash
   POST /v1/auth/refresh
   ```
   Uses refresh token from cookie or body.

### Example: Create Todo

```bash
curl -X POST http://localhost:3000/v1/todos \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Drizzle ORM",
    "description": "Read the documentation",
    "completed": false
  }'
```

### Example: List Todos with Pagination

```bash
# First page
curl "http://localhost:3000/v1/todos?limit=20" \
  -H "Authorization: Bearer <accessToken>"

# Next page (using cursor from previous response)
curl "http://localhost:3000/v1/todos?limit=20&cursor=018e5f5d-1234-7890-abcd-123456789abc" \
  -H "Authorization: Bearer <accessToken>"
```

## Adding New Features

### 1. Create Domain Schema

Create Zod schema in `src/domain/<feature>/<feature>.schema.ts`:

```typescript
import { z } from 'zod';

export const FeatureSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	// ... other fields
});

export const CreateFeatureSchema = FeatureSchema.omit({
	id: true,
	user_id: true,
});
export const UpdateFeatureSchema = CreateFeatureSchema.partial();

export type Feature = z.infer<typeof FeatureSchema>;
export type CreateFeature = z.infer<typeof CreateFeatureSchema>;
export type UpdateFeature = z.infer<typeof UpdateFeatureSchema>;
```

### 2. Create Drizzle Schema

Add schema definition in `src/db/schema/<feature>.ts`:

```typescript
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const features = pgTable(
	'template_api_features',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// ... other columns
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		userIdIdx: index('idx_template_api_features_user_id').on(table.userId),
	})
);
```

### 3. Create Repository

Implement CRUD in `src/repositories/<feature>Repository.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { features } from '../db/schema/features';
import type {
	CreateFeature,
	UpdateFeature,
	FeatureResponse,
} from '../domain/feature/feature.schema.js';

export function createFeatureRepository(app: FastifyInstance) {
	return {
		async create(
			data: CreateFeature,
			userId: string
		): Promise<FeatureResponse> {
			const id = uuidv7();
			const [result] = await app.db
				.insert(features)
				.values({
					id,
					userId,
					// ... other fields
				})
				.returning();

			return {
				id: result.id,
				// ... map to response type (excluding user_id)
			};
		},

		async getById(id: string, userId: string): Promise<FeatureResponse | null> {
			const [result] = await app.db
				.select()
				.from(features)
				.where(and(eq(features.id, id), eq(features.userId, userId)))
				.limit(1);

			if (!result) return null;
			// ... map to response type
		},

		// ... other CRUD methods
	};
}
```

### 4. Create Service

Add business logic in `src/services/<feature>Service.ts`:

```typescript
import type {
	CreateFeature,
	UpdateFeature,
	FeatureResponse,
} from '../domain/feature/feature.schema.js';
import { ValidationError } from '../utils/errors.js';

export function createFeatureService(deps: {
	createFeature: (
		data: CreateFeature,
		userId: string
	) => Promise<FeatureResponse>;
	// ... other repository methods
}) {
	return {
		async createFeature(
			data: CreateFeature,
			userId: string
		): Promise<FeatureResponse> {
			// Business logic: Validate data
			if (data.title?.trim().length === 0) {
				throw new ValidationError('Title cannot be empty');
			}

			return deps.createFeature(data, userId);
		},
		// ... other service methods
	};
}
```

### 5. Create Controller

Add HTTP handlers in `src/controllers/<feature>Controller.ts`:

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
	CreateFeatureSchema,
	UpdateFeatureSchema,
} from '../domain/feature/feature.schema.js';
import {
	ValidationError,
	NotFoundError,
	UnauthorizedError,
} from '../utils/errors.js';
import type { createFeatureService } from '../services/featureService.js';

export function createFeatureController(
	app: FastifyInstance,
	featureService: ReturnType<typeof createFeatureService>
) {
	return {
		async createHandler(request: FastifyRequest, reply: FastifyReply) {
			const userId = request.userId;
			if (!userId) {
				throw new UnauthorizedError();
			}

			const parsed = CreateFeatureSchema.safeParse(request.body);
			if (!parsed.success) {
				throw new ValidationError('Invalid request body', parsed.error.errors);
			}

			const feature = await featureService.createFeature(parsed.data, userId);
			return reply.code(201).send(feature);
		},
		// ... other handlers
	};
}
```

### 6. Create Routes

Wire everything in `src/routes/<feature>.ts` and register in `server.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { createFeatureRepository } from '../repositories/featureRepository.js';
import { createFeatureService } from '../services/featureService.js';
import { createFeatureController } from '../controllers/featureController.js';
import { uuidParamSchema } from '../validators/params.validator.js';

export async function featureRoutes(app: FastifyInstance) {
	const repo = createFeatureRepository(app);
	const service = createFeatureService({
		createFeature: (data, userId) => repo.create(data, userId),
		// ... wire other methods
	});
	const controller = createFeatureController(app, service);

	app.post(
		'/v1/features',
		{ preValidation: [app.authenticate] },
		controller.createHandler
	);

	app.get(
		'/v1/features/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.getByIdHandler
	);

	// ... other routes
}
```

Then register in `src/server.ts`:

```typescript
import { featureRoutes } from './routes/feature.js';

// ... inside buildServer()
await app.register(featureRoutes);
```

### 7. Generate Migration

```bash
npm run db:generate
npm run db:migrate
```

## Testing Database Access

With Drizzle ORM:

```typescript
// In repository
const features = await app.db
	.select()
	.from(features)
	.where(eq(features.userId, userId));

// Full type safety with auto-complete!
```

## Using Transactions

For multi-step operations:

```typescript
import { withTransactionFromApp } from '../utils/transactions.js';

await withTransactionFromApp(app, async (txDb) => {
  // All queries use the same connection
  await txDb.insert(users).values({...});
  await txDb.insert(todos).values({...});
  // Both succeed or both fail (atomicity)
});
```

## Type Safety

- **Drizzle schemas** provide full TypeScript inference
- **Domain schemas** (Zod) validate at runtime
- **Type augmentation** in `src/types/fastify.d.ts` extends Fastify types
- **Custom error classes** for type-safe error handling

When adding new decorators, update `fastify.d.ts`.

## Logging

- **Pino logger** integrated with Fastify
- **Request ID** automatically included in logs
- **Log levels**: fatal/error/warn/info/debug/trace (configurable via `LOG_LEVEL`)
- **Structured logging** with correlation IDs

## Query Monitoring

Slow queries are automatically logged:

- **Threshold**: Configurable via `SLOW_QUERY_THRESHOLD` (default: 1000ms)
- **Metrics endpoint**: `GET /internal/metrics/queries`
- **Logging**: Slow requests logged with duration, URL, method

## Health Checks

Multiple health check endpoints available:

- `GET /health` - Full health check (includes database)
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (includes database)

Use for:

- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring and alerting

## Common Workflows

### Adding a new field to existing table

1. Update Drizzle schema in `src/db/schema/<table>.ts`
2. Update domain schema in `src/domain/<feature>/<feature>.schema.ts`
3. Generate migration: `npm run db:generate`
4. Review generated migration
5. Apply: `npm run db:migrate`
6. Update repository if needed
7. Update service/controller if needed

### User-scoped resources

All user data must be filtered by `user_id`. Repositories automatically scope queries:

```typescript
.where(and(eq(features.id, id), eq(features.userId, userId)))
```

This ensures users can only access their own data.

### Using pagination

For list endpoints, support pagination:

```typescript
// In service
async getAll(userId: string, pagination?: PaginationParams) {
  return deps.getAll(userId, pagination);
}

// In repository
async getAll(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<FeatureResponse>> {
  const limit = pagination?.limit ?? 20;
  // ... implement cursor-based pagination
}
```

## Error Handling

Use custom error classes for consistent error responses:

```typescript
import {
	NotFoundError,
	ValidationError,
	UnauthorizedError,
} from '../utils/errors.js';

// In controller
if (!feature) {
	throw new NotFoundError('Feature not found');
}

// In service
if (!userId) {
	throw new UnauthorizedError('User not authenticated');
}
```

The global error handler will automatically convert these to appropriate HTTP responses.

## Rate Limiting

Rate limiting is automatically applied to all routes:

- **Default**: 100 requests per time window
- **Configurable**: Via `RATE_LIMIT_MAX` and `RATE_LIMIT_TIME_WINDOW`
- **Per IP**: Rate limits are per IP address
- **Response**: `429 Too Many Requests` when limit exceeded

## CORS Configuration

CORS is automatically configured:

- **Development**: Allows all origins (default)
- **Production**: Requires explicit origins via `CORS_ORIGIN` environment variable
- **Format**: Comma-separated list: `CORS_ORIGIN=https://app1.com,https://app2.com`

## Input Sanitization

Use sanitization utilities for additional security:

```typescript
import {
	sanitizeString,
	sanitizeEmail,
	sanitizeObject,
} from '../utils/sanitize.js';

const sanitizedTitle = sanitizeString(data.title);
const sanitizedEmail = sanitizeEmail(data.email);
const sanitizedData = sanitizeObject(data);
```

## Debugging

### Request ID Tracking

All requests have a request ID for correlation:

- **Header**: `X-Request-ID` in responses
- **Logs**: Request ID included in all log entries
- **Usage**: Use for log correlation and distributed tracing

### Query Monitoring

Check slow queries:

```bash
GET /internal/metrics/queries
```

Returns:

- Slow queries list
- Failed queries list
- Average query duration
- Total query count

### Logs

Check application logs for:

- Request/response information
- Error details (in development)
- Slow query warnings
- Rate limit information

## Using Caching

### Redis Caching

The application includes Redis caching for frequently accessed data:

```typescript
// In repository - automatic caching
const cacheKey = `todo:${userId}:${id}`;
return app.cache.getOrSet(
  cacheKey,
  async () => {
    // Database query
    return await app.db.select()...;
  },
  3600 // TTL: 1 hour
);

// Cache invalidation on write
await app.cache.del(`todo:${userId}:${id}`);
await app.cache.delPattern(`todo:${userId}:*`);
```

**Cache Key Pattern**: `{resource}:{userId}:{id}` ensures user-scoped caching for security.

## Using DTOs

### Data Transfer Objects

DTOs separate API contract from domain models:

```typescript
// In controller
import { fromCreateTodoDTO, toTodoResponseDTO } from '../dto/todo.dto.js';

// Transform request DTO to domain model
const createData = fromCreateTodoDTO(parsed.data as CreateTodoDTO);
const todo = await todoService.createTodo(createData, userId);

// Transform domain model to response DTO
const responseDTO = toTodoResponseDTO(todo);
return reply.code(201).send(responseDTO);
```

**Benefits:**

- Explicit API contract
- Prevents sensitive data exposure
- Easier API versioning
- Type-safe transformations

## Using DI Container (Optional)

### Dependency Injection

The template includes an optional DI container:

```typescript
// In server.ts
import { registerServices } from './di/services.js';
registerServices(app);

// In routes
import { getAuthController } from '../di/services.js';
const controller = getAuthController();
```

**Note:** Manual wiring remains the default pattern for simplicity. DI container is available for better testability.

## API Documentation

### Swagger UI

Interactive API documentation is available at `/docs` endpoint:

- Visit `http://localhost:3000/docs` in development
- Try endpoints directly from the UI
- View request/response schemas
- Test authentication flows

**Configuration:**

- Enabled automatically in development/test
- Set `ENABLE_SWAGGER=true` to enable in production

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Validate inputs** at both route and service levels
3. **Use custom error classes** for consistent error handling
4. **Never expose `user_id`** to clients
5. **Use UUIDv7** for time-ordered IDs
6. **Implement pagination** for list endpoints
7. **Add tests** for new features
8. **Use type-safe queries** with Drizzle ORM
9. **Sanitize inputs** beyond Zod validation
10. **Monitor query performance** regularly
11. **Use caching** for frequently accessed data
12. **Transform data via DTOs** for clear API contracts
13. **Document endpoints** with Swagger schemas
