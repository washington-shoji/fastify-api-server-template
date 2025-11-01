# Fastify API Template

A production-ready, scalable Fastify starter template with comprehensive features:

- **Security**: JWT authentication (access + refresh tokens), rate limiting, CORS, input sanitization
- **Database**: PostgreSQL with Drizzle ORM, connection pooling, migrations
- **Scalability**: Pagination, transactions, query monitoring, health checks
- **Observability**: Structured logging with request IDs, error tracking
- **API**: RESTful endpoints with versioning support (/v1/\*)
- **Testing**: Vitest infrastructure with integration tests
- **Type Safety**: Full TypeScript support with type augmentation

## Features

### Security & Authentication

- JWT-based authentication with separate access/refresh token secrets
- Rate limiting middleware
- CORS configuration (environment-based)
- Input sanitization utilities
- httpOnly cookies for token storage

### Database & ORM

- Drizzle ORM with full type safety
- Connection pooling (configurable min/max connections)
- UUIDv7 for time-ordered primary keys
- Automatic migrations via Drizzle Kit

### Scalability

- Cursor-based pagination for list endpoints
- Database transaction support
- Query performance monitoring
- Connection pool configuration
- Rate limiting per IP

### Observability

- Structured logging with Pino
- Request ID correlation tracking
- Query performance metrics
- Enhanced health check endpoints
- Error tracking and monitoring

### API Features

- RESTful CRUD operations
- API versioning (/v1/\* routes)
- Backward compatibility with legacy routes
- Request/response validation
- UUID parameter validation

### Developer Experience

- Middleware for automatic user ID extraction
- Global error handler with custom error classes
- Type-safe repository pattern
- Business logic separation (Services)
- Testing infrastructure (Vitest)

## Quick Start

```bash
npm i
cp .env.example .env
# Edit .env with your values
npm run db:migrate  # Run database migrations
npm run dev         # Start development server
```

**Endpoints:**

- Health: `GET http://localhost:3000/health`
- Issue tokens: `POST http://localhost:3000/auth/token`
- Refresh token: `POST http://localhost:3000/auth/refresh`
- Protected: `GET http://localhost:3000/auth/me`
- Todos: `GET http://localhost:3000/todos` (authenticated)
- V1 API: `GET http://localhost:3000/v1/todos` (authenticated)

## Scripts

- `npm run dev` - Run with `ts-node-dev` (watch mode)
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled app
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run migrations against database
- `npm run db:push` - Push schema changes directly (dev only)
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Environment Variables

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - 32+ character secret for access tokens
- `JWT_REFRESH_SECRET` - 32+ character secret for refresh tokens

**Optional (with defaults):**

- `PORT=3000` - Server port
- `HOST=0.0.0.0` - Server host
- `NODE_ENV=development` - Environment (development/test/production)
- `ACCESS_TOKEN_TTL=15m` - Access token expiration
- `REFRESH_TOKEN_TTL=7d` - Refresh token expiration
- `COOKIE_DOMAIN=localhost` - Cookie domain
- `COOKIE_SECURE=false` - Set to `true` in production (requires HTTPS)
- `CORS_ORIGIN` - Comma-separated list of allowed origins (default: all in dev, none in prod)
- `DB_POOL_MIN=5` - Minimum database connections
- `DB_POOL_MAX=20` - Maximum database connections
- `RATE_LIMIT_MAX=100` - Maximum requests per time window
- `RATE_LIMIT_TIME_WINDOW=1 minute` - Rate limit time window
- `LOG_LEVEL=info` - Log level (fatal/error/warn/info/debug/trace)
- `SLOW_QUERY_THRESHOLD=1000` - Slow query threshold in milliseconds
- `REDIS_URL` - Redis connection URL (optional, for caching)
- `TRUST_PROXY` - Trust proxy headers (true/false)

## Project Structure

```text
src/
  server.ts              # Fastify app, plugins, routes, graceful shutdown
  env.ts                 # Environment validation via Zod
  db/
    index.ts             # Drizzle ORM setup & connection pool
    migrate.ts           # Migration runner
    schema/              # Database schema definitions
      users.ts
      todos.ts
  plugins/
    db.ts                # Database plugin
    jwt.ts               # JWT plugin with access/refresh token support
  middlewares/
    auth.middleware.ts   # Automatic user ID extraction
    rateLimit.middleware.ts  # Rate limiting configuration
    requestId.middleware.ts  # Request ID generation & tracking
  repositories/          # Data access layer (Drizzle ORM)
  services/              # Business logic layer
  controllers/           # HTTP handlers
  routes/                # Route definitions
    v1/                  # Versioned API routes
      auth.ts
      todo.ts
  domain/                # Domain schemas (Zod validation)
  utils/
    errors.ts            # Custom error classes
    errorHandler.ts      # Global error handler
    pagination.ts        # Pagination utilities
    transactions.ts      # Transaction support
    sanitize.ts          # Input sanitization
    queryMonitor.ts      # Query performance monitoring
  types/
    fastify.d.ts         # Type augmentation
  validators/            # Parameter validators
tests/
  integration/           # Integration tests
  setup.ts               # Test setup
drizzle/                 # Generated migrations
vitest.config.ts         # Test configuration
```

## Core Concepts

### Architecture

- **Layered Architecture**: Repository → Service → Controller → Route
- **Plugins**: Cross-cutting concerns (DB, JWT, rate limiting)
- **Middlewares**: Request processing (auth, request ID, validation)
- **Type Safety**: Full TypeScript with Fastify type augmentation

### Request Flow

1. HTTP request → Fastify route
2. Middleware: Request ID, Rate limiting, CORS
3. Authentication: JWT verification (`app.authenticate`)
4. Auth middleware: Extract `userId` from token
5. Route handler → Controller
6. Controller: Validate input, call Service
7. Service: Business logic, call Repository
8. Repository: Drizzle ORM queries
9. Response flows back through layers

### Error Handling

- Custom error classes: `NotFoundError`, `ValidationError`, `UnauthorizedError`, etc.
- Global error handler with structured responses
- Zod validation errors automatically handled
- Database errors logged but sanitized for clients

### Security

- JWT tokens with separate secrets for access/refresh
- Rate limiting per IP address
- CORS configuration based on environment
- Input sanitization utilities
- `user_id` never exposed to clients
- SQL injection protection via Drizzle ORM

### Performance

- Connection pooling (configurable)
- Cursor-based pagination
- Query monitoring and slow query detection
- Transaction support for multi-step operations

## API Overview

### Health Endpoints

- `GET /health` - Full health check (database connectivity)
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Authentication

- `POST /auth/token` - Issue access & refresh tokens
- `POST /auth/refresh` - Refresh tokens
- `GET /auth/me` - Get current user (authenticated)

### Todos (Legacy Routes)

- `POST /todos` - Create todo (authenticated)
- `GET /todos` - List todos with pagination (authenticated)
- `GET /todos/:id` - Get todo by ID (authenticated)
- `PUT /todos/:id` - Update todo (authenticated)
- `DELETE /todos/:id` - Delete todo (authenticated)

### Todos (Version 1 API)

- `POST /v1/todos` - Create todo (authenticated)
- `GET /v1/todos?limit=20&cursor=<uuid>` - List todos with pagination (authenticated)
- `GET /v1/todos/:id` - Get todo by ID (authenticated)
- `PUT /v1/todos/:id` - Update todo (authenticated)
- `DELETE /v1/todos/:id` - Delete todo (authenticated)

**Pagination Parameters:**

- `limit` (optional, default: 20, max: 100) - Number of items per page
- `cursor` (optional) - UUID cursor for pagination

**Note:** `user_id` is never exposed to clients. User ownership is determined from authentication context.

## Testing

Run tests:

```bash
npm test              # Run all tests
npm run test:ui       # Run with UI
npm run test:coverage  # Run with coverage
```

Test structure:

- Integration tests in `tests/integration/`
- Health check tests
- Authentication tests
- More tests can be added following the same pattern

## Development

See `docs/DEVELOPMENT.md` for detailed development workflows.

## Deployment

See `docs/DEPLOYMENT.md` for deployment checklist and configuration.

## Documentation

- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/API.md` - Complete API documentation
- `docs/DEVELOPMENT.md` - Development workflows
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/SCALABILITY_ANALYSIS.md` - Scalability analysis and improvements

## License

Private/Internal use
