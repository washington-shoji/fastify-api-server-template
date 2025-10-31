import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { db, pool } from '../db/index.js';

async function dbConnector(app: FastifyInstance) {
	// Test connection on startup
	await pool.query('SELECT 1');

	app.decorate('db', db);

	app.addHook('onClose', async () => {
		await pool.end();
	});
}

export default fp(dbConnector, {
	name: 'db-plugin',
});
