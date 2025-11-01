# Architecture

This template follows a layered architecture with Fastify's plugin system for cross-cutting concerns, enhanced with comprehensive middleware, utilities, and monitoring capabilities.

## Overview

- `src/server.ts` builds the Fastify app, registers plugins, middlewares, and routes, and handles graceful shutdown.
- `src/env.ts` loads and validates environment variables using Zod.
- `src/db/` contains Drizzle ORM setup, schemas, and migration runner.
- `src/plugins/` contains Fastify plugins (DB, JWT).
- `src/middlewares/` contains application middlewares (auth, rate limiting, request ID).
- `src/routes/` defines feature routes. Routes wire repositories → services → controllers.
- `src/controllers/` contain HTTP handlers; they extract request data, validate, call services, and shape responses.
- `src/services/` contain business logic; they orchestrate repositories and apply domain rules.
- `src/repositories/` encapsulate data access using Drizzle ORM; they map between domain and database.
- `src/domain/` contains domain schemas (Zod validation) and types.
- `src/utils/` contains utility functions (errors, pagination, transactions, sanitization, query monitoring).
- `src/validators/` contains parameter validators for routes.
- `src/types/fastify.d.ts` augments Fastify types for custom decorators and request properties.

## Request Flow

1. **Incoming HTTP request** → Fastify route
2. **Request ID Middleware** (`setupRequestIdMiddleware`) - Generates/uses request ID for correlation
3. **Rate Limiting** (`setupRateLimit`) - Enforces rate limits per IP
4. **CORS** - Validates origin based on environment
5. **Authentication** (for protected routes) - `preValidation: [app.authenticate]` verifies JWT
6. **Auth Middleware** (`setupAuthMiddleware`) - Extracts `userId` from `request.user.sub`
7. **Route Handler** → Controller
8. **Controller** - Validates input with Zod schemas, handles errors, calls service
9. **Service** - Applies business logic, validates domain rules, calls repository
10. **Repository** - Uses Drizzle ORM to query database with full type safety
11. **Response flows back**: Repository → Service → Controller → Route → Client
12. **Query Monitoring** - Logs slow queries (>threshold)

## Database & ORM

### Drizzle ORM

- Type-safe ORM with excellent TypeScript inference
- Parameterized queries (SQL injection protection)
- Schema definitions in `src/db/schema/` (users, todos, etc.)
- Migrations managed via Drizzle Kit (`npm run db:generate` to generate, `npm run db:migrate` to apply)

### Connection Pooling

- Single Pool managed in `src/db/index.ts`
- Configurable via environment variables:
  - `DB_POOL_MIN` (default: 5) - Minimum connections
  - `DB_POOL_MAX` (default: 20) - Maximum connections
- Connection timeouts and keepAlive configured
- Pool error handling for graceful failures

### IDs

- **UUIDv7** (time-ordered) generated at application level
- Better performance than sequential IDs
- Enables efficient cursor-based pagination
- Global uniqueness

## JWT Strategy

### Token Management

- **Access Token**: Short-lived, default `ACCESS_TOKEN_TTL=15m`
  - Signed with `JWT_ACCESS_SECRET`
  - Used for API authentication
- **Refresh Token**: Longer-lived, default `REFRESH_TOKEN_TTL=7d`
  - Signed with `JWT_REFRESH_SECRET` (separate secret for security)
  - Used to obtain new access/refresh token pairs
  - **Security**: Different secret prevents token reuse attacks

### Cookies

- `access_token` and `refresh_token` set as httpOnly cookies
- Secure flag in production (`COOKIE_SECURE=true`)
- Domain and SameSite configurable

### User Binding

- User ID extracted from JWT `sub` claim via `setupAuthMiddleware`
- Automatically attached to `request.userId` for easy access
- All data operations scoped by `user_id`

## Middleware

### Request ID Middleware

- Generates unique request ID (UUID) for each request
- Checks for existing `x-request-id` or `x-correlation-id` headers
- Adds request ID to logs for correlation
- Sets `X-Request-ID` response header

### Auth Middleware

- Automatically extracts `userId` from `request.user.sub`
- Attaches to `request.userId` for use in handlers
- Eliminates repetitive user ID extraction code

### Rate Limiting Middleware

- Global rate limiting via `@fastify/rate-limit`
- Configurable max requests and time window
- Rate limiting per IP address
- Returns `429 Too Many Requests` when limit exceeded

## Error Handling

### Custom Error Classes

Located in `src/utils/errors.ts`:

- `AppError` - Base error class
- `NotFoundError` - 404 errors
- `ValidationError` - 400 validation errors (includes error details)
- `UnauthorizedError` - 401 authentication errors
- `ForbiddenError` - 403 authorization errors
- `ConflictError` - 409 resource conflicts
- `InternalServerError` - 500 server errors

### Global Error Handler

Located in `src/utils/errorHandler.ts`:

- Handles all errors consistently
- Converts errors to structured JSON responses
- Logs errors with request context (URL, method, request ID)
- Handles:
  - Custom AppError instances
  - Zod validation errors
  - JWT errors
  - Database errors (PostgreSQL error codes)
  - Generic errors (sanitized in production)

### Error Response Format

```json
{
	"message": "Error message",
	"errors": [
		// Only for ValidationError
		{
			"path": ["field"],
			"message": "Validation error message"
		}
	]
}
```

## Validation

### Input Validation

- **Zod schemas** in `src/domain/*` for request body validation
- **Fastify schemas** for URL parameter validation (`src/validators/params.validator.ts`)
- **UUID validation** for `:id` parameters
- **Pagination validation** for query parameters

### Input Sanitization

Utilities in `src/utils/sanitize.ts`:

- HTML tag removal
- Dangerous character filtering
- Email sanitization
- UUID validation and sanitization
- Recursive object sanitization

## Pagination

### Cursor-Based Pagination

Located in `src/utils/pagination.ts`:

- Uses UUIDv7 (time-ordered) for efficient cursor-based pagination
- Parameters:
  - `limit` - Items per page (default: 20, max: 100)
  - `cursor` - UUID cursor for next page
- Response includes:
  - `items` - Array of results
  - `nextCursor` - Cursor for next page (if available)
  - `hasMore` - Boolean indicating more results
  - `count` - Number of items in current page

## Transactions

### Transaction Support

Located in `src/utils/transactions.ts`:

- `withTransaction()` - Execute function within database transaction
- `withTransactionFromApp()` - Convenience wrapper using Fastify app
- Automatic BEGIN/COMMIT/ROLLBACK handling
- Connection pool management

### Usage Example

```typescript
await withTransactionFromApp(app, async (txDb) => {
  // All queries use the same connection
  await txDb.insert(users).values({...});
  await txDb.insert(todos).values({...});
  // Both succeed or both fail (atomicity)
});
```

## Query Monitoring

### Performance Tracking

Located in `src/utils/queryMonitor.ts`:

- Tracks slow queries (configurable threshold, default: 1000ms)
- Logs slow requests with duration, URL, method
- Metrics endpoint: `GET /internal/metrics/queries`
- Provides:
  - Slow queries list
  - Failed queries list
  - Average query duration
  - Total query count

## Health Checks

### Endpoints

- `GET /health` - Full health check (includes database connectivity)
- `GET /health/live` - Liveness probe (app is running)
- `GET /health/ready` - Readiness probe (app ready to serve, includes DB check)

### Response Format

```json
{
	"status": "ok",
	"timestamp": "2024-01-15T10:30:00.000Z",
	"checks": {
		"database": "healthy"
	}
}
```

## API Versioning

### Strategy

- **Versioned routes**: `/v1/todos`, `/v1/auth`
- **Legacy routes**: `/todos`, `/auth` (backward compatibility)
- Future versions: `/v2/*` can be added without breaking existing clients
- Routes defined in `src/routes/v1/`

## Logging

### Structured Logging

- **Pino logger** integrated with Fastify
- **Request ID** automatically included in logs
- **Log levels**: fatal/error/warn/info/debug/trace (configurable via `LOG_LEVEL`)
- **Serializers**: Custom request serializer includes method, URL, request ID

### Log Format

```
{
  "level": 30,
  "time": 1234567890,
  "msg": "Request completed",
  "method": "GET",
  "url": "/todos",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## TypeScript Augmentation

### Type Extensions

`src/types/fastify.d.ts` augments Fastify types:

- `app.db` - Drizzle database instance
- `app.authenticate` - Authentication guard
- `app.signAccessToken` - Sign access token
- `app.signRefreshToken` - Sign refresh token (uses separate secret)
- `app.verifyRefreshToken` - Verify refresh token
- `request.user` - JWT payload
- `request.userId` - Extracted user ID (from middleware)
- `request.requestId` - Request correlation ID

## Layer Responsibilities

### Routes

- Register endpoints
- Wire dependencies (repository → service → controller)
- Apply middleware (authentication, validation schemas)
- Define route-level configuration

### Controllers

- HTTP concerns (request/response, status codes)
- Input validation (Zod schemas)
- Error handling (throw custom errors)
- Response formatting

### Services

- Business logic
- Domain rules validation
- Orchestration between repositories
- Data transformation

### Repositories

- Data access only
- Drizzle ORM queries
- Database mapping
- User-scoped queries (automatic filtering by `user_id`)

### Domain

- Pure domain models
- Zod validation schemas
- Type definitions
- No business logic

## Security Features

### Authentication

- JWT with separate secrets for access/refresh tokens
- httpOnly cookies for token storage
- Token rotation on refresh

### Authorization

- User-scoped data access (automatic filtering)
- `user_id` never exposed to clients

### Input Protection

- Zod validation for all inputs
- Input sanitization utilities
- SQL injection protection (Drizzle ORM)
- Parameter validation (UUID format)

### Rate Limiting

- Per-IP rate limiting
- Configurable limits and time windows
- Prevents brute force and DoS attacks

### CORS

- Environment-based configuration
- Development: allows all origins
- Production: requires explicit origins

## Performance Features

### Connection Pooling

- Configurable min/max connections
- Connection timeouts
- KeepAlive for connection reuse

### Pagination

- Cursor-based for efficient large datasets
- Configurable page size

### Query Monitoring

- Slow query detection
- Performance metrics
- Query analysis tools

### Transactions

- Atomic multi-step operations
- Data consistency guarantees

## Scalability Considerations

### Horizontal Scaling

- Stateless application (JWT-based auth)
- No sticky sessions required
- Shared database connection pool
- Request ID for distributed tracing

### Database Scaling

- Connection pooling handles concurrent connections
- Read replicas support (future)
- Query optimization and monitoring

### Caching (Ready for Implementation)

- Redis configuration in environment variables
- Infrastructure ready for caching layer
- Can be added for frequently accessed data

## Testing

### Test Infrastructure

- **Vitest** for test framework
- **Integration tests** for API endpoints
- **Test setup** with database fixtures
- **Coverage reporting** configured

### Test Structure

```
tests/
  integration/
    health.test.ts    # Health check tests
    auth.test.ts      # Authentication tests
  setup.ts            # Test configuration
```
