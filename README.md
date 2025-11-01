# Fastify API Template

A production-ready, scalable Fastify starter template with comprehensive features:

- **Security**: JWT authentication (access + refresh tokens), rate limiting, CORS, input sanitization
- **Database**: PostgreSQL with Drizzle ORM, connection pooling, migrations
- **Scalability**: Pagination, transactions, query monitoring, health checks, Redis caching
- **Observability**: Structured logging with request IDs, error tracking
- **API**: RESTful endpoints with versioning support (/v1/\*), Swagger/OpenAPI docs
- **Testing**: Vitest infrastructure with integration tests
- **Type Safety**: Full TypeScript support with type augmentation
- **Architecture**: DTO layer, optional DI container, clean separation of concerns

## Features

### Security & Authentication

- User registration and login with password hashing (bcryptjs)
- JWT-based authentication with separate access/refresh token secrets
- Password-based authentication (email/username + password)
- Automatic token issuance on registration and login
- Logout endpoint to clear authentication cookies
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
- **Redis caching** for frequently accessed data
- Cache invalidation strategies

### Observability

- Structured logging with Pino
- Request ID correlation tracking
- Query performance metrics
- Enhanced health check endpoints
- Error tracking and monitoring

### API Features

- RESTful CRUD operations
- API versioning (/v1/\* routes)
- Request/response validation
- UUID parameter validation
- **Auto-generated Swagger/OpenAPI documentation** at `/docs` endpoint
- Comprehensive API schemas and examples

### Developer Experience

- Middleware for automatic user ID extraction
- Global error handler with custom error classes
- Type-safe repository pattern
- Business logic separation (Services)
- Testing infrastructure (Vitest with Testcontainers)
- **Testcontainers** for isolated integration tests (no database interference)
- **CI/CD safe** - Connection termination errors suppressed during cleanup
- **DTO layer** for request/response transformation
- **Optional DI container** for dependency management
- Swagger UI for interactive API exploration

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
- API Documentation: `GET http://localhost:3000/docs` (Swagger UI)
- Register: `POST http://localhost:3000/v1/auth/register`
- Login: `POST http://localhost:3000/v1/auth/login`
- Logout: `POST http://localhost:3000/v1/auth/logout`
- Issue tokens: `POST http://localhost:3000/v1/auth/token`
- Refresh token: `POST http://localhost:3000/v1/auth/refresh`
- Protected: `GET http://localhost:3000/v1/auth/me`
- Todos: `GET http://localhost:3000/v1/todos` (authenticated)

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
- `REDIS_HOST` - Redis host (if not using REDIS_URL)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_TTL` - Default cache TTL in seconds (default: 3600)
- `TRUST_PROXY` - Trust proxy headers (true/false)
- `ENABLE_SWAGGER` - Enable Swagger in production (default: false, auto-enabled in dev/test)

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
    redis.ts             # Redis caching plugin
  config/
    swagger.ts           # Swagger/OpenAPI configuration
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
  dto/                   # Data Transfer Objects (request/response)
    auth.dto.ts         # Auth DTOs and transformation functions
    todo.dto.ts         # Todo DTOs and transformation functions
  di/                    # Dependency Injection (optional)
    container.ts        # DI container implementation
    services.ts          # Service registration
  utils/
    schemas.ts          # JSON schemas for Swagger documentation
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
6. Controller: Validate input (Zod), transform DTO → domain model, call Service
7. Service: Business logic, call Repository
8. Repository: Check cache, use Drizzle ORM queries, update cache
9. Controller: Transform domain model → response DTO
10. Response flows back through layers

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
- **Redis caching** with automatic cache invalidation
- Cache-first strategy with database fallback
- **Response compression** (gzip, deflate) for responses > 1KB
- **ETag support** for HTTP conditional requests and 304 Not Modified responses

## API Overview

### Health Endpoints

- `GET /health` - Full health check (database connectivity)
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Authentication

- `POST /v1/auth/token` - Issue access & refresh tokens
- `POST /v1/auth/refresh` - Refresh tokens
- `GET /v1/auth/me` - Get current user (authenticated)

### Todos

- `POST /v1/todos` - Create todo (authenticated)
- `GET /v1/todos?limit=20&cursor=<uuid>` - List todos with pagination (authenticated)
- `GET /v1/todos/:id` - Get todo by ID (authenticated)
- `PUT /v1/todos/:id` - Update todo (authenticated)
- `DELETE /v1/todos/:id` - Delete todo (authenticated)

**Pagination Parameters:**

- `limit` (optional, default: 20, max: 100) - Number of items per page
- `cursor` (optional) - UUID cursor for pagination

**Note:** `user_id` is never exposed to clients. User ownership is determined from authentication context.

## API Documentation

Interactive API documentation is available at:

- **Swagger UI**: `http://localhost:3000/docs` (development/test only, or set `ENABLE_SWAGGER=true`)

The Swagger UI provides:

- Complete API endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing
- Example requests and responses

## Testing

Tests use **Testcontainers** for isolated PostgreSQL containers, ensuring tests never interfere with your development or production databases.

**Prerequisites**: Docker must be installed and running.

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
- Todo CRUD tests
- Testcontainers for isolated test databases
- Automatic database cleanup between tests

See `tests/README.md` for detailed testing documentation.

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

## Disclaimer

**This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.**

**USE AT YOUR OWN RISK**

By using this template repository, you acknowledge that:

- The software is provided without any guarantees or warranties
- You are solely responsible for testing, validating, and securing any deployment
- The maintainers/authors are not responsible for any security vulnerabilities, bugs, data loss, or other issues that may arise from using this template
- You should review and audit all code before using it in production
- You should implement appropriate security measures, backups, and monitoring for your specific use case
- Any modifications or usage of this template is at your own discretion and risk

## License

Private/Internal use
