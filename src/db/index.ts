import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { env } from '../env.js';
import * as usersSchema from './schema/users';
import * as todosSchema from './schema/todos';

// Configure connection pool with appropriate settings for scalability
const poolConfig: PoolConfig = {
	connectionString: env.DATABASE_URL,
	// Connection pool settings
	min: env.DB_POOL_MIN ?? 5, // Minimum connections
	max: env.DB_POOL_MAX ?? 20, // Maximum connections
	idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
	connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
	// Keep connections alive
	keepAlive: true,
};

export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

export const db = drizzle(pool, {
	schema: {
		...usersSchema,
		...todosSchema,
	},
});

export { usersSchema, todosSchema };
