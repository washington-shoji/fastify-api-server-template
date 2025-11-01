# Deployment

## Prerequisites

- Node.js 18+ runtime
- PostgreSQL database (12+)
- Environment variables configured
- Database migrations applied

## Build

```bash
npm run build
```

This compiles TypeScript to `dist/` directory.

## Database Migrations

**Critical:** Run migrations before starting the application.

```bash
npm run db:migrate
```

Or in your deployment pipeline:

```bash
NODE_ENV=production npm run db:migrate
```

⚠️ **Important:** Always review generated migrations before applying in production.

## Environment Variables

Ensure all required environment variables are set:

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Strong secret (32+ characters) for access tokens
- `JWT_REFRESH_SECRET` - Strong secret (32+ characters) for refresh tokens (must be different from access secret)

### Recommended for Production

#### Server Configuration

- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)
- `HOST=0.0.0.0` (or specific host)

#### Security Configuration

- `COOKIE_SECURE=true` - Required for HTTPS
- `COOKIE_DOMAIN=yourdomain.com` - Your production domain
- `CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com` - Explicit allowed origins

#### JWT Configuration

- `ACCESS_TOKEN_TTL=15m` - Access token expiration
- `REFRESH_TOKEN_TTL=7d` - Refresh token expiration

#### Database Pool Configuration

- `DB_POOL_MIN=10` - Minimum database connections (adjust based on load)
- `DB_POOL_MAX=50` - Maximum database connections (adjust based on load)

#### Rate Limiting Configuration

- `RATE_LIMIT_MAX=100` - Maximum requests per time window (adjust based on needs)
- `RATE_LIMIT_TIME_WINDOW=1 minute` - Rate limit time window

#### Logging Configuration

- `LOG_LEVEL=info` - Log level (use `warn` or `error` in production for less noise)

#### Query Monitoring Configuration

- `SLOW_QUERY_THRESHOLD=1000` - Slow query threshold in milliseconds

#### Redis Configuration (Optional)

- `REDIS_URL=redis://localhost:6379` - Redis connection URL (if using caching)
- `REDIS_PASSWORD` - Redis password (if required)

#### Proxy Configuration

- `TRUST_PROXY=true` - Trust proxy headers (if behind reverse proxy)

## Running the Application

```bash
npm start
```

Or with a process manager:

```bash
pm2 start dist/server.js --name fastify-api
```

## Reverse Proxy

Run behind a reverse proxy (Nginx, Caddy, Traefik) with HTTPS termination.

**Example Nginx config:**

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # Liveness probe
    location /health/live {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # Readiness probe
    location /health/ready {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

**Critical settings:**

- Set `COOKIE_SECURE=true` when behind HTTPS
- Ensure `COOKIE_DOMAIN` matches your production domain
- Set `TRUST_PROXY=true` if behind reverse proxy
- Configure proper CORS origins via `CORS_ORIGIN`

## Process Managers

### PM2

```bash
npm install -g pm2
pm2 start dist/server.js --name fastify-api --instances max
pm2 save
pm2 startup
```

**Configuration file (`ecosystem.config.js`):**

```javascript
module.exports = {
	apps: [
		{
			name: 'fastify-api',
			script: 'dist/server.js',
			instances: 'max',
			exec_mode: 'cluster',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
			error_file: './logs/err.log',
			out_file: './logs/out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			autorestart: true,
			max_memory_restart: '1G',
		},
	],
};
```

Then:

```bash
pm2 start ecosystem.config.js
```

### Systemd

Create `/etc/systemd/system/fastify-api.service`:

```ini
[Unit]
Description=Fastify API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
EnvironmentFile=/path/to/app/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fastify-api

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fastify-api
sudo systemctl start fastify-api
```

### Docker

Example Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run application
CMD ["npm", "start"]
```

**Docker Compose example:**

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - COOKIE_SECURE=true
      - CORS_ORIGIN=https://yourdomain.com
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
        ]
      interval: 30s
      timeout: 3s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dbname
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastify-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastify-api
  template:
    metadata:
      labels:
        app: fastify-api
    spec:
      containers:
        - name: api
          image: your-registry/fastify-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: JWT_ACCESS_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: access
            - name: JWT_REFRESH_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: refresh
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
---
apiVersion: v1
kind: Service
metadata:
  name: fastify-api
spec:
  selector:
    app: fastify-api
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Database Considerations

### Connection Pooling

- Configured in `src/db/index.ts` with environment variables
- **Default**: Min 5, Max 20 connections
- **Production**: Adjust based on load (recommended: Min 10, Max 50)
- Connection timeouts and keepAlive configured
- Pool error handling for graceful failures

### Migration Strategy

1. **Development/Staging:**

   - Run `npm run db:generate` to create migrations
   - Review migrations thoroughly
   - Run `npm run db:migrate` to apply
   - Test in staging before production

2. **Production:**
   - Test migrations in staging first
   - Run migrations in deployment pipeline before app start
   - Consider backup before major schema changes
   - Use transactions for data migrations

### Database Backups

- Set up regular PostgreSQL backups
- Test restore procedures
- Consider point-in-time recovery for critical data
- Automate backup retention policies

### Connection String

Example connection string:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

For production:

- Use SSL connections (`sslmode=require`)
- Use strong passwords
- Restrict database access to application servers

## Logging and Monitoring

### Logging

- **Pino logger** outputs structured JSON logs to stdout/stderr
- **Request ID** automatically included in all logs
- Capture logs via:
  - Process manager logs (PM2, systemd)
  - Container logs (Docker, Kubernetes)
  - Log aggregation services (ELK, Datadog, etc.)

### Structured Logging

Logs include:

- Request ID for correlation
- Timestamp
- Log level
- Message
- Context (URL, method, user ID, etc.)

### Health Checks

Multiple endpoints available:

- `GET /health` - Full health check (includes database connectivity)
- `GET /health/live` - Liveness probe (app is running)
- `GET /health/ready` - Readiness probe (app ready to serve)

**Use cases:**

- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring and alerting

### Monitoring

Monitor:

- **Response times** - Use query monitoring endpoint
- **Error rates** - Monitor logs and error responses
- **Database connection pool usage** - Monitor pool metrics
- **Memory and CPU usage** - System metrics
- **Request throughput** - Requests per second
- **Rate limiting** - Track 429 responses

### Query Monitoring

Access query metrics (internal endpoint):

```bash
GET /internal/metrics/queries
```

Returns:

- Slow queries list (last 50)
- Failed queries list (last 50)
- Average query duration
- Total query count

**Note:** Protect this endpoint in production (authentication/firewall).

## Scaling

### Horizontal Scaling

- **Stateless application** (JWT-based auth)
- **Scale horizontally** behind load balancer
- **No sticky sessions** required
- **Shared database** connection pool
- **Request ID** for distributed tracing

### Database Scaling

- **Connection pooling** handles concurrent connections
- **Read replicas** for read-heavy workloads (future)
- **Query optimization** and monitoring
- **Index optimization** based on query patterns

### Performance Optimization

1. **Connection Pool**: Tune `DB_POOL_MIN` and `DB_POOL_MAX` based on load
2. **Rate Limiting**: Adjust `RATE_LIMIT_MAX` based on API usage
3. **Query Monitoring**: Monitor slow queries and optimize
4. **Caching**: Implement Redis caching for frequently accessed data (infrastructure ready)

## Security Checklist

- ✅ Strong JWT secrets (use crypto.randomBytes, 32+ characters)
- ✅ Separate secrets for access and refresh tokens
- ✅ `COOKIE_SECURE=true` in production
- ✅ HTTPS only (enforced by reverse proxy)
- ✅ Environment variables not in code
- ✅ Database credentials secured
- ✅ Regular dependency updates (`npm audit`)
- ✅ Input validation via Zod schemas
- ✅ Input sanitization utilities
- ✅ SQL injection protection (Drizzle ORM handles this)
- ✅ CORS properly configured (explicit origins in production)
- ✅ Rate limiting enabled
- ✅ Request ID for correlation and security tracking
- ✅ `user_id` never exposed to clients
- ✅ Query monitoring for security analysis
- ✅ Health check endpoints for monitoring

## Zero-Downtime Deployment

1. **Run migrations first** (backward compatible changes)
2. **Deploy new code** (behind load balancer)
3. **Gradual rollout** (deploy to subset of instances)
4. **Monitor health checks** and metrics
5. **Rollback plan** ready

**For breaking changes:**

1. Deploy code that supports both old and new schema/API
2. Migrate data (if needed)
3. Deploy code with new schema/API
4. Remove old code compatibility in next release

## Graceful Shutdown

The application implements graceful shutdown:

- **SIGTERM/SIGINT**: Graceful shutdown with database connection cleanup
- **Uncaught exceptions**: Handled and logged
- **Unhandled rejections**: Handled and logged
- **Database connections**: Properly closed on shutdown

**Process managers** should handle graceful shutdown properly:

- PM2: Automatically handles SIGTERM
- systemd: Properly configured in service file
- Docker: Uses SIGTERM for graceful shutdown
- Kubernetes: Termination grace period configured

## Troubleshooting

### Migration Errors

- Check database connection
- Verify migration files are present in `drizzle/`
- Check migration log in database (`__drizzle_migrations` table)
- Review migration SQL for syntax errors

### Connection Errors

- Verify `DATABASE_URL` is correct
- Check database is accessible
- Verify network/firewall rules
- Check connection pool limits
- Monitor connection pool usage

### Performance Issues

- Check database query performance (use `/internal/metrics/queries`)
- Monitor connection pool usage
- Review application logs for slow queries
- Use database query analysis tools
- Check rate limiting configuration
- Monitor memory and CPU usage

### Rate Limiting Issues

- Check `RATE_LIMIT_MAX` configuration
- Monitor 429 responses
- Adjust rate limits based on legitimate usage
- Consider per-user rate limiting (future enhancement)

### Authentication Issues

- Verify JWT secrets are correct and strong
- Check token expiration times
- Verify separate secrets for access/refresh tokens
- Check cookie domain and secure settings
- Review JWT token structure in logs (development only)

## Production Best Practices

1. **Use HTTPS** - Always use HTTPS in production
2. **Strong secrets** - Generate strong random secrets for JWT
3. **Explicit CORS** - Specify exact allowed origins
4. **Monitor logs** - Set up log aggregation and alerting
5. **Health checks** - Use health endpoints for monitoring
6. **Backup database** - Regular automated backups
7. **Test migrations** - Always test migrations in staging first
8. **Resource limits** - Set appropriate CPU/memory limits
9. **Graceful shutdown** - Ensure proper cleanup on shutdown
10. **Security updates** - Regularly update dependencies
