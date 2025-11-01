# Testing

## Overview

This project uses **Vitest** for testing with **Testcontainers** for isolated database testing.

## Testcontainers

Tests use **Testcontainers** to spin up isolated PostgreSQL containers, ensuring:

- ✅ **No interference** with development/production databases
- ✅ **Isolated test environment** - each test run gets a fresh database
- ✅ **Automatic cleanup** - containers are automatically stopped after tests
- ✅ **Reproducible tests** - same database state every run
- ✅ **Parallel-safe** - multiple developers can run tests simultaneously

## Prerequisites

### Docker

**Testcontainers requires Docker to be running** on your machine.

- **Windows/Mac**: Docker Desktop must be installed and running
- **Linux**: Docker daemon must be running (`sudo systemctl start docker`)

Verify Docker is running:

```bash
docker ps
```

If you see an error, start Docker and try again.

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm test -- --watch
```

### Run tests with UI

```bash
npm run test:ui
```

### Run tests with coverage

```bash
npm run test:coverage
```

## Test Structure

```
tests/
  integration/          # Integration tests
    health.test.ts     # Health check tests
    auth.test.ts       # Authentication tests
    todo.test.ts       # Todo CRUD tests
  helpers/             # Test utilities
    testDb.ts          # Testcontainers database setup
  setup.ts             # Global test setup
```

## How Testcontainers Work

1. **Before all tests** (`tests/setup.ts`):

   - Starts a PostgreSQL container (postgres:15-alpine)
   - Runs all database migrations automatically
   - Overrides `DATABASE_URL` environment variable
   - All subsequent tests use the isolated container

2. **During tests**:

   - Each test gets a fresh database state
   - `beforeEach` hooks can clean the database using `cleanTestDatabase()`
   - Tests can create test data as needed

3. **After all tests**:
   - Container is automatically stopped and removed
   - All test data is discarded

## Writing Integration Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../src/server.js';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';

describe('Feature Tests', () => {
  let app: FastifyInstance;
  let testDb: ReturnType<typeof createTestDb>;

  beforeAll(async () => {
    // Build server (uses test container database automatically)
    app = await buildServer();
    testDb = createTestDb();
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanTestDatabase();

    // Create test data as needed
    await testDb.insert(users).values({...});
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test feature', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/feature',
    });
    expect(response.statusCode).toBe(200);
  });
});
```

### Test Database Helper Functions

- `startTestDatabase()` - Start PostgreSQL container (called automatically in setup.ts)
- `stopTestDatabase()` - Stop container (called automatically in setup.ts)
- `createTestDb()` - Get Drizzle instance for test database
- `cleanTestDatabase()` - Truncate all tables (except migrations) for test isolation
- `getTestDbUrl()` - Get test database connection URL

### Example: Testing with Authentication

```typescript
beforeEach(async () => {
	await cleanTestDatabase();

	// Create test user
	const testUserId = uuidv7();
	await testDb.insert(users).values({
		id: testUserId,
		userName: 'test_user',
		email: 'test@example.com',
		password: 'hashed_password',
	});

	// Issue token for authentication
	const tokenResponse = await app.inject({
		method: 'POST',
		url: '/v1/auth/token',
		payload: { userId: testUserId },
	});

	testAccessToken = JSON.parse(tokenResponse.body).accessToken;
});

it('should access protected endpoint', async () => {
	const response = await app.inject({
		method: 'GET',
		url: '/v1/todos',
		headers: {
			Authorization: `Bearer ${testAccessToken}`,
		},
	});

	expect(response.statusCode).toBe(200);
});
```

## Test Timeouts

Tests have increased timeouts for container startup:

- **Test timeout**: 30 seconds (default: 10s)
- **Hook timeout**: 60 seconds (for container startup/shutdown)

These timeouts are configured in `vitest.config.ts`.

## Troubleshooting

### Docker not running

**Error**: `Cannot connect to the Docker daemon`

**Solution**: Start Docker Desktop or Docker daemon

### Container startup timeout

**Error**: Test timeouts during container startup

**Solution**:

- Check Docker has enough resources allocated
- Ensure Docker is running properly
- Try running tests individually

### Port conflicts

**Error**: Port already in use

**Solution**: Testcontainers automatically assigns ports, but if you have issues:

- Close other PostgreSQL instances
- Check for running containers: `docker ps`

### Migration errors

**Error**: Migration fails on test container

**Solution**:

- Ensure `drizzle/` folder contains migration files
- Check migration files are valid SQL

## CI/CD Considerations

When running in CI/CD:

1. **Docker must be available** in the CI environment
2. **Testcontainers work well** in Docker-in-Docker or Docker socket mounting
3. **Container startup time** may be slower in CI - ensure adequate timeouts

## Benefits of Testcontainers

1. **Isolation**: Each test run is completely isolated
2. **No setup required**: No need for separate test database configuration
3. **Automatic cleanup**: Containers are removed automatically
4. **Real database**: Tests run against real PostgreSQL (not mocks)
5. **Parallel execution**: Multiple test runs don't conflict
6. **Reproducible**: Same environment every time

## Alternative: Local Test Database

If you prefer not to use Testcontainers (or Docker isn't available):

1. Create a separate test database
2. Update `.env.test` with test database URL
3. Remove testcontainer imports from `tests/setup.ts`
4. Manually run migrations before tests

However, **Testcontainers is recommended** for true isolation and reproducibility.
