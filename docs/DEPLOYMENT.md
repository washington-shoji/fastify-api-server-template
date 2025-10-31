# Deployment

## Build

```bash
npm run build
```

This compiles TypeScript to `dist/`.

## Run

```bash
npm start
```

Ensure the following environment variables are set in the target environment:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT` (optional)
- `COOKIE_DOMAIN`, `COOKIE_SECURE` (recommended in production)

## Reverse proxy

- Run behind Nginx/Caddy/Traefik with HTTPS termination.
- If using cookies, set `COOKIE_SECURE=true` over HTTPS.

## Logging and monitoring

- Fastify logs to stdout. Capture via your process manager or container logs.
- Add probes for `/health`.

## Process managers

- Use PM2, systemd, Docker, or your platform’s supervisor to restart on failure and on deploys.

## Scaling

- Scale horizontally behind a load balancer.
- Consider sticky sessions only if your app logic requires them; JWTs are stateless.
