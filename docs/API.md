# API Documentation

Base URL: `http://localhost:3000`

## Health

### GET `/health`

Simple health check endpoint.

**Response:**

```json
{
	"status": "ok"
}
```

## Auth

### POST `/auth/token`

Issue access and refresh tokens for a user.

**Body:**

```json
{
	"userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**

```json
{
	"accessToken": "eyJhbGc...",
	"refreshToken": "eyJhbGc..."
}
```

- Also sets `access_token` and `refresh_token` cookies (httpOnly, lax).
- User ID must exist in the database.

### POST `/auth/refresh`

Refresh access and refresh tokens.

**Body (optional if cookie present):**

```json
{
	"refreshToken": "eyJhbGc..."
}
```

**Response:**

```json
{
	"accessToken": "eyJhbGc...",
	"refreshToken": "eyJhbGc..."
}
```

- Uses refresh token from cookie or request body.
- Also sets new tokens as cookies.

### GET `/auth/me`

Get current authenticated user info.

**Authentication:**

- `Authorization: Bearer <accessToken>` header, or
- `access_token` cookie

**Response:**

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

## Todos (CRUD)

All todo endpoints require authentication and are user-scoped.

### POST `/todos`

Create a new todo.

**Authentication:** Required (Bearer token or cookie)

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
	"user_id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "Complete project",
	"description": "Finish the Fastify API template",
	"completed": false,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T10:30:00.000Z"
}
```

### GET `/todos`

Get all todos for the authenticated user.

**Authentication:** Required

**Response:**

```json
{
	"todos": [
		{
			"id": "018e5f5d-1234-7890-abcd-123456789abc",
			"user_id": "550e8400-e29b-41d4-a716-446655440000",
			"title": "Complete project",
			"description": "Finish the Fastify API template",
			"completed": false,
			"created_at": "2024-01-15T10:30:00.000Z",
			"updated_at": "2024-01-15T10:30:00.000Z"
		}
	],
	"count": 1
}
```

- Returns todos ordered by `created_at DESC`.
- Only returns todos owned by the authenticated user.

### GET `/todos/:id`

Get a specific todo by ID.

**Authentication:** Required

**Parameters:**

- `id` (UUID) - Todo ID

**Response:** `200 OK`

```json
{
	"id": "018e5f5d-1234-7890-abcd-123456789abc",
	"user_id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "Complete project",
	"description": "Finish the Fastify API template",
	"completed": false,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**

- `404 Not Found` - Todo not found or not owned by user

### PUT `/todos/:id`

Update a todo.

**Authentication:** Required

**Parameters:**

- `id` (UUID) - Todo ID

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
	"user_id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "Updated title",
	"description": "Updated description",
	"completed": true,
	"created_at": "2024-01-15T10:30:00.000Z",
	"updated_at": "2024-01-15T11:00:00.000Z"
}
```

**Errors:**

- `400 Bad Request` - Invalid request body
- `404 Not Found` - Todo not found or not owned by user

### DELETE `/todos/:id`

Delete a todo.

**Authentication:** Required

**Parameters:**

- `id` (UUID) - Todo ID

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Todo not found or not owned by user

## Error responses

All endpoints may return:

- `400 Bad Request` - Invalid request body or validation errors
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Resource not found or not accessible
- `500 Internal Server Error` - Server error

Example error response:

```json
{
	"message": "Todo not found"
}
```

Validation errors:

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
