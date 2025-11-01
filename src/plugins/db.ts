import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { db, pool } from '../db/index.js';

async function dbConnector(app: FastifyInstance) {
	// Test connection on startup
	await pool.query('SELECT 1');

	app.decorate('db', db);

	app.addHook('onClose', async () => {
		// Only close pool if it's not already closed (prevents double-close errors)
		if (!pool.ended) {
			try {
				await pool.end();
			} catch (error) {
				// Ignore errors during cleanup (container may already be closing in tests)
				console.warn('Error closing database pool in onClose hook:', error);
			}
		}
	});
}

export default fp(dbConnector, {
	name: 'db-plugin',
});
