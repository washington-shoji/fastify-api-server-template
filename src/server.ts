import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './env.js';
import { healthRoutes } from './routes/health.js';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todo.js';
import { setupErrorHandler } from './utils/errorHandler.js';
import { setupAuthMiddleware } from './middlewares/auth.middleware.js';
import { setupRateLimit } from './middlewares/rateLimit.middleware.js';
import { setupRequestIdMiddleware } from './middlewares/requestId.middleware.js';
import { setupQueryMonitoring } from './utils/queryMonitor.js';

async function buildServer() {
	const app = Fastify({
		logger: {
			level: process.env.LOG_LEVEL || 'info',
			// Add request ID to logs
			serializers: {
				req: (req) => {
					return {
						method: req.method,
						url: req.url,
						requestId: (req as any).requestId,
					};
				},
			},
		},
	});

	// Setup global error handler first
	setupErrorHandler(app);

	// Setup request ID middleware for correlation tracking
	setupRequestIdMiddleware(app);

	// Setup auth middleware to extract userId automatically
	setupAuthMiddleware(app);

	// Setup rate limiting (before routes)
	await setupRateLimit(app);

	// Setup query monitoring for performance tracking
	setupQueryMonitoring(app, env.SLOW_QUERY_THRESHOLD ?? 1000);

	// Configure CORS based on environment
	await app.register(cors, {
		origin: env.CORS_ORIGINS,
		credentials: true,
	});

	await app.register(cookie, {
		parseOptions: {
			httpOnly: true,
			secure: env.COOKIE_SECURE === 'true',
			sameSite: 'lax',
			domain: env.COOKIE_DOMAIN,
		},
	});

	await app.register(dbPlugin);
	await app.register(jwtPlugin);
	await app.register(healthRoutes);
	await app.register(authRoutes);
	await app.register(todoRoutes);

	return app;
}

async function start() {
	const app = await buildServer();
	try {
		await app.listen({ port: env.PORT_NUMBER, host: '0.0.0.0' });
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();
