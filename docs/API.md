# API Documentation

Base URL: `http://localhost:3000`

## Health

GET `/health`

Response
```json
{ "status": "ok" }
```

## Auth

### Issue tokens
POST `/auth/token`

Body
```json
{ "userId": "123", "email": "demo@example.com" }
```

Response
```json
{ "accessToken": "...", "refreshToken": "..." }
```

- Also sets `access_token` and `refresh_token` cookies (httpOnly, lax).

### Refresh tokens
POST `/auth/refresh`

Body (optional if cookie present)
```json
{ "refreshToken": "..." }
```

Response
```json
{ "accessToken": "...", "refreshToken": "..." }
```

### Current user
GET `/auth/me`

Auth
- `Authorization: Bearer <accessToken>` header, or
- `access_token` cookie

Response
```json
{ "user": { "sub": "123", "email": "demo@example.com", "iat": 0, "exp": 0 } }
```
