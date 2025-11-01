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

export async function buildServer() {
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

	// Legacy routes (backward compatibility - can be removed in future)
	await app.register(authRoutes);
	await app.register(todoRoutes);

	// Version 1 API routes
	const { authV1Routes } = await import('./routes/v1/auth.js');
	const { todoV1Routes } = await import('./routes/v1/todo.js');
	await app.register(authV1Routes);
	await app.register(todoV1Routes);

	return app;
}

async function start() {
	const app = await buildServer();
	try {
		await app.listen({ port: env.PORT_NUMBER, host: env.HOST });
		app.log.info(`Server listening on port ${env.PORT_NUMBER}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

// Graceful shutdown handler
async function shutdown(signal: string) {
	console.log(`\n${signal} received. Starting graceful shutdown...`);

	// Import pool to close connections
	const { pool } = await import('./db/index.js');

	try {
		// Close all database connections
		await pool.end();
		console.log('Database connections closed.');

		// Exit successfully
		process.exit(0);
	} catch (error) {
		console.error('Error during shutdown:', error);
		process.exit(1);
	}
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	shutdown('unhandledRejection');
});

start();
