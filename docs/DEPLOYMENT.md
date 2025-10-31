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

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Strong secret (32+ characters) for access tokens
- `JWT_REFRESH_SECRET` - Strong secret (32+ characters) for refresh tokens

**Recommended for production:**

- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)
- `COOKIE_SECURE=true` - Required for HTTPS
- `COOKIE_DOMAIN=yourdomain.com` - Your production domain
- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL=7d`

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
    listen 443 ssl;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Critical settings:**

- Set `COOKIE_SECURE=true` when behind HTTPS
- Ensure `COOKIE_DOMAIN` matches your production domain

## Process Managers

### PM2

```bash
npm install -g pm2
pm2 start dist/server.js --name fastify-api
pm2 save
pm2 startup
```

### Systemd

Create `/etc/systemd/system/fastify-api.service`:

```ini
[Unit]
Description=Fastify API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable fastify-api
sudo systemctl start fastify-api
```

### Docker

Example Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Database Considerations

### Connection Pooling

- Drizzle uses PostgreSQL connection pooling via `pg` library.
- Default pool size is 10 connections.
- Adjust pool size in `src/db/index.ts` if needed.

### Migration Strategy

1. **Development/Staging:**

   - Run `npm run db:generate` to create migrations
   - Review migrations
   - Run `npm run db:migrate` to apply

2. **Production:**
   - Test migrations in staging first
   - Run migrations in deployment pipeline before app start
   - Consider backup before major schema changes

### Database Backups

- Set up regular PostgreSQL backups
- Test restore procedures
- Consider point-in-time recovery for critical data

## Logging and Monitoring

### Logging

- Fastify logger outputs to stdout/stderr
- Capture logs via your process manager or container logs
- Consider structured logging for production (Pino with formatters)

### Health Checks

- Use `/health` endpoint for health checks
- Configure load balancer health checks
- Monitor database connectivity

### Monitoring

Monitor:

- Response times
- Error rates
- Database connection pool usage
- Memory and CPU usage

## Scaling

### Horizontal Scaling

- Stateless application (JWT-based auth)
- Scale horizontally behind load balancer
- No sticky sessions required

### Database Scaling

- Consider read replicas for read-heavy workloads
- Connection pooling handles concurrent connections
- Monitor query performance

### Caching

Consider:

- Redis for session/token caching (if needed)
- Query result caching for frequently accessed data
- Response caching for static or slow-changing data

## Security Checklist

- ✅ Strong JWT secrets (use crypto.randomBytes)
- ✅ `COOKIE_SECURE=true` in production
- ✅ HTTPS only (enforced by reverse proxy)
- ✅ Environment variables not in code
- ✅ Database credentials secured
- ✅ Regular dependency updates (`npm audit`)
- ✅ Input validation via Zod schemas
- ✅ SQL injection protection (Drizzle ORM handles this)
- ✅ CORS properly configured
- ✅ Rate limiting (consider adding)

## Zero-Downtime Deployment

1. Run migrations first (backward compatible changes)
2. Deploy new code
3. Restart application
4. Monitor for errors
5. Rollback plan ready

For breaking changes:

1. Deploy code that supports both old and new schema
2. Migrate data
3. Remove old code compatibility

## Troubleshooting

### Migration Errors

- Check database connection
- Verify migration files are present in `drizzle/`
- Check migration log in database (`__drizzle_migrations` table)

### Connection Errors

- Verify `DATABASE_URL` is correct
- Check database is accessible
- Verify network/firewall rules

### Performance Issues

- Check database query performance
- Monitor connection pool usage
- Review application logs
- Use database query analysis tools
