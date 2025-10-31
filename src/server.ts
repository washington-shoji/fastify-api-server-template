import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './env.js';
import { healthRoutes } from './routes/health.js';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todo.js';

async function buildServer() {
	const app = Fastify({
		logger: true,
	});

	await app.register(cors, {
		origin: true,
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
