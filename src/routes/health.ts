import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
	app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			// Check database connectivity
			await app.db.execute('SELECT 1 as health');

			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				checks: {
					database: 'healthy',
				},
			};
		} catch (error) {
			request.log.error({ error }, 'Health check failed');
			reply.code(503);
			return {
				status: 'error',
				timestamp: new Date().toISOString(),
				checks: {
					database: 'unhealthy',
				},
			};
		}
	});

	// Liveness probe - simple check that app is running
	app.get('/health/live', async () => {
		return { status: 'ok', timestamp: new Date().toISOString() };
	});

	// Readiness probe - checks if app is ready to serve requests
	app.get(
		'/health/ready',
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				// Check database connectivity
				await app.db.execute('SELECT 1 as health');

				return {
					status: 'ready',
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				request.log.error({ error }, 'Readiness check failed');
				reply.code(503);
				return {
					status: 'not ready',
					timestamp: new Date().toISOString(),
				};
			}
		}
	);
}
