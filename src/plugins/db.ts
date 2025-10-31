import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';

async function dbConnector(app: FastifyInstance) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  // Test a simple connection on startup to fail fast if misconfigured
  await pool.query('SELECT 1');

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
}

export default fp(dbConnector, {
  name: 'db-plugin'
});


