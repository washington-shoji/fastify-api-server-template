# API Documentation

Base URL: `http://localhost:3000`

## Interactive Documentation

**Swagger UI**: Visit `http://localhost:3000/docs` for interactive API documentation.

The Swagger UI provides:

- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing
- Example requests and responses

**Note**: Swagger UI is automatically enabled in development/test environments. Set `ENABLE_SWAGGER=true` to enable in production.

## API Versioning

This API uses versioning to handle breaking changes gracefully:

- **Version 1**: `/v1/*` routes (all endpoints are versioned)
- **Future versions**: `/v2/*` routes can be added without breaking existing clients

**All endpoints are versioned** - always use `/v1/*` routes.

## Authentication

All protected endpoints require authentication via:

- `Authorization: Bearer <accessToken>` header, or
- `access_token` httpOnly cookie

### Token Lifecycle

1. **Register/Login**: `POST /v1/auth/register` or `POST /v1/auth/login` to get tokens
2. **Use access token**: Include in `Authorization` header or rely on cookie
3. **Refresh tokens**: `POST /v1/auth/refresh` when access token expires
4. **Logout**: `POST /v1/auth/logout` to clear cookies

**Note**: The `/v1/auth/token` endpoint is also available for issuing tokens when you already have a user ID (useful for admin operations or service-to-service authentication).

## Health Endpoints

### GET `/health`

Full health check including database connectivity.

**Response:** `200 OK`

```json
{
	"status": "ok",
	"timestamp": "2024-01-15T10:30:00.000Z",
	"checks": {
		"database": "healthy"
	}
}
```

**Response:** `503 Service Unavailable` (if database unavailable)

```json
{
	"status": "error",
	"timestamp": "2024-01-15T10:30:00.000Z",
	"checks": {
		"database": "unhealthy"
	}
}
```

### GET `/health/live`

Liveness probe - indicates the application is running.

**Response:** `200 OK`

```json
{
	"status": "ok",
	"timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/health/ready`

Readiness probe - indicates the application is ready to serve requests (includes database check).

**Response:** `200 OK`

```json
{
	"status": "ready",
	"timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:** `503 Service Unavailable` (if not ready)

```json
{
	"status": "not ready",
	"timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Authentication Endpoints

### POST `/v1/auth/register`

Register a new user.

**Body:**

```json
{
	"user_name": "johndoe",
	"email": "john@example.com",
	"password": "securepassword123"
}
```

**Response:** `201 Created`

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- Creates a new user with hashed password
- Automatically issues tokens after successful registration
- Sets `access_token` and `refresh_token` as httpOnly cookies
- Username must be unique (1-255 characters)
- Email must be unique and valid format
- Password must be at least 8 characters

**Errors:**

- `400 Bad Request` - Invalid request body, duplicate email, or duplicate username

### POST `/v1/auth/login`

Login with email/username and password.

**Body:**

```json
{
	"identifier": "john@example.com",
	"password": "securepassword123"
}
```

**Response:** `200 OK`

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- `identifier` can be either email or username
- Validates password against hashed password in database
- Sets `access_token` and `refresh_token` as httpOnly cookies
- Access token expires in 15 minutes (default)
- Refresh token expires in 7 days (default)

**Errors:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid credentials (wrong password or user not found)

### POST `/v1/auth/logout`

Logout and clear authentication cookies.

**Response:** `200 OK`

```json
{
	"message": "Logged out successfully"
}
```

- Clears `access_token` and `refresh_token` cookies
- No authentication required

### POST `/v1/auth/token`

Issue access and refresh tokens for a user.

**Body:**

```json
{
	"userId": "550e8400-e29b-41d4-a716-446655440000",
	"email": "user@example.com"
}
```

**Response:** `200 OK`

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- Sets `access_token` and `refresh_token` as httpOnly cookies
- User ID must exist in the database
- Access token expires in 15 minutes (default)
- Refresh token expires in 7 days (default)

**Errors:**

- `400 Bad Request` - Invalid request body
- `404 Not Found` - User not found

### POST `/v1/auth/refresh`

Refresh access and refresh tokens.

**Body (optional if cookie present):**

```json
{
	"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- Uses refresh token from cookie or request body
- Sets new tokens as httpOnly cookies
- Refresh token must be signed with `JWT_REFRESH_SECRET`

**Errors:**

- `401 Unauthorized` - Invalid or missing refresh token

### GET `/v1/auth/me`

Get current authenticated user info.

**Authentication:** Required (Bearer token or cookie)

**Response:** `200 OK`

```json
{
	"user": {
		"sub": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"iat": 1234567890,
		"exp": 1234567890
	}
}
```

**Errors:**

- `401 Unauthorized` - Missing or invalid authentication token

## Todo Endpoints

All todo endpoints require authentication and are user-scoped. The `user_id` is never exposed to clients.

### POST `/v1/todos`

Create a new todo.

**Authentication:** Required

**Body:**

```json
{
	"title": "Complete project",
	"description": "Finish the Fastify API template",
	"completed": false
}
```

**Response:** `201 Created`

```json
{
	"id": "018e5f5d-1234-7890-abcd-123456789abc",
	"title": "Complete project",
	"description": "Finish the Fastify API template",
	"completed": false,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Note:** `user_id` is never exposed to clients. User ownership is determined from the authentication context.

**Errors:**

- `400 Bad Request` - Invalid request body or validation errors
- `401 Unauthorized` - Missing or invalid authentication token

### GET `/v1/todos`

Get all todos for the authenticated user with pagination.

**Authentication:** Required

**Query Parameters:**

- `limit` (optional, default: 20, max: 100) - Number of items per page
- `cursor` (optional) - UUID cursor for pagination (from previous response)

**Example:**

```
GET /v1/todos?limit=20&cursor=018e5f5d-1234-7890-abcd-123456789abc
```

**Response:** `200 OK`

```json
{
	"items": [
		{
			"id": "018e5f5d-1234-7890-abcd-123456789abc",
			"title": "Complete project",
			"description": "Finish the Fastify API template",
			"completed": false,
			"created_at": "2024-01-15T10:30:00.000Z",
			"updated_at": "2024-01-15T10:30:00.000Z"
		}
	],
	"nextCursor": "018e5f5d-1234-7890-abcd-123456789abc",
	"hasMore": true,
	"count": 20
}
```

**Pagination:**

- Use `nextCursor` from response as `cursor` parameter for next page
- If `hasMore` is `false`, no more pages available
- `count` is the number of items in current page

**Note:** `user_id` is never returned. Only todos owned by the authenticated user are returned. Results are ordered by `created_at DESC` (newest first).

**Errors:**

- `400 Bad Request` - Invalid pagination parameters
- `401 Unauthorized` - Missing or invalid authentication token

### GET `/v1/todos/:id`

Get a specific todo by ID.

**Authentication:** Required

**Parameters:**

- `id` (UUID, required) - Todo ID (must be valid UUID format)

**Response:** `200 OK`

```json
{
	"id": "018e5f5d-1234-7890-abcd-123456789abc",
	"title": "Complete project",
	"description": "Finish the Fastify API template",
	"completed": false,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Note:** `user_id` is never exposed to clients. Only returns todos owned by the authenticated user.

**Errors:**

- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Todo not found or not owned by user

### PUT `/v1/todos/:id`

Update a todo.

**Authentication:** Required

**Parameters:**

- `id` (UUID, required) - Todo ID

**Body:** (all fields optional)

```json
{
	"title": "Updated title",
	"description": "Updated description",
	"completed": true
}
```

**Response:** `200 OK`

```json
{
	"id": "018e5f5d-1234-7890-abcd-123456789abc",
	"title": "Updated title",
	"description": "Updated description",
	"completed": true,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T11:00:00.000Z"
}
```

**Note:** `user_id` is never exposed to clients.

**Errors:**

- `400 Bad Request` - Invalid UUID format or request body
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Todo not found or not owned by user

### DELETE `/v1/todos/:id`

Delete a todo.

**Authentication:** Required

**Parameters:**

- `id` (UUID, required) - Todo ID

**Response:** `204 No Content`

**Errors:**

- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Todo not found or not owned by user

## Internal Endpoints

### GET `/internal/metrics/queries`

Query performance metrics (internal use only).

**Note:** This endpoint should be protected by network/firewall in production. Authentication can be added.

**Response:** `200 OK`

```json
{
	"slowQueries": [
		{
			"timestamp": 1234567890,
			"duration": 1500,
			"query": "SELECT * FROM template_api_todos..."
		}
	],
	"failedQueries": [],
	"averageDuration": 250,
	"totalQueries": 1000,
	"threshold": 1000
}
```

## Error Responses

All endpoints may return the following error codes:

### 400 Bad Request

Invalid request body, validation errors, or invalid parameters.

**Response:**

```json
{
	"message": "Invalid request body",
	"errors": [
		{
			"path": ["title"],
			"message": "String must contain at least 1 character(s)"
		}
	]
}
```

### 401 Unauthorized

Missing or invalid authentication token.

**Response:**

```json
{
	"message": "Unauthorized"
}
```

### 404 Not Found

Resource not found or not accessible to the user.

**Response:**

```json
{
	"message": "Todo not found"
}
```

### 409 Conflict

Resource conflict (e.g., unique constraint violation).

**Response:**

```json
{
	"message": "Resource already exists"
}
```

### 429 Too Many Requests

Rate limit exceeded.

**Response:**

```json
{
	"message": "Too many requests",
	"retryAfter": 60
}
```

### 500 Internal Server Error

Server error.

**Response:**

```json
{
	"message": "Internal server error"
}
```

In development, error details may be included. In production, only the message is returned.

## Rate Limiting

The API implements rate limiting per IP address:

- **Default**: 100 requests per time window (configurable via `RATE_LIMIT_MAX`)
- **Time Window**: 1 minute (configurable via `RATE_LIMIT_TIME_WINDOW`)
- **Response**: `429 Too Many Requests` when limit exceeded
- **Headers**: `Retry-After` indicates seconds until retry is allowed

## Request Headers

### X-Request-ID

The API automatically generates and tracks request IDs for correlation:

- **Request**: Optional `X-Request-ID` or `X-Correlation-ID` header
- **Response**: `X-Request-ID` header is always set
- **Usage**: Use for log correlation and distributed tracing

## Response Headers

- `X-Request-ID` - Request correlation ID
- `Content-Type: application/json` - All responses are JSON
- `Set-Cookie` - Authentication tokens (httpOnly cookies)

## Security Notes

1. **User ID Privacy**: `user_id` is never exposed in any API response. User ownership is determined from the authentication context (`request.user.sub`).

2. **Token Security**:

   - Access and refresh tokens use separate secrets
   - Tokens are stored in httpOnly cookies (prevents XSS)
   - Refresh tokens use a different secret than access tokens

3. **Input Validation**: All inputs are validated via Zod schemas and sanitized.

4. **SQL Injection**: Protected via Drizzle ORM parameterized queries.

5. **Rate Limiting**: Enforced per IP to prevent abuse.

## Pagination Best Practices

1. **First Request**: Don't include `cursor`, set `limit` as needed
2. **Next Page**: Use `nextCursor` from previous response as `cursor` parameter
3. **Last Page**: When `hasMore` is `false`, no more pages available
4. **Limit**: Keep between 1-100 for optimal performance (default: 20)

**Example Flow:**

```bash
# First page
GET /v1/todos?limit=20
# Response: { "items": [...], "nextCursor": "abc...", "hasMore": true }

# Next page
GET /v1/todos?limit=20&cursor=abc...
# Response: { "items": [...], "nextCursor": "def...", "hasMore": true }

# Last page
GET /v1/todos?limit=20&cursor=def...
# Response: { "items": [...], "hasMore": false }
```
