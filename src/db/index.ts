import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { env } from '../env.js';
import * as usersSchema from './schema/users';
import * as todosSchema from './schema/todos';

// Lazy initialization for database connection
let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create the database connection pool
 * This allows for lazy initialization, which is important for tests
 * where DATABASE_URL might be set after module import
 */
function getPool(): Pool {
	if (!poolInstance) {
		// Read DATABASE_URL directly from process.env for test compatibility
		// This ensures we use the latest value, even if env module was loaded earlier
		const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

		const poolConfig: PoolConfig = {
			connectionString: databaseUrl,
			// Connection pool settings
			min: env.DB_POOL_MIN ?? 5, // Minimum connections
			max: env.DB_POOL_MAX ?? 20, // Maximum connections
			idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
			connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
			// Keep connections alive
			keepAlive: true,
		};

		poolInstance = new Pool(poolConfig);

		// Handle pool errors
		poolInstance.on('error', (err) => {
			console.error('Unexpected error on idle client', err);
			process.exit(-1);
		});
	}
	return poolInstance;
}

/**
 * Get or create the Drizzle database instance
 */
function getDb() {
	if (!dbInstance) {
		dbInstance = drizzle(getPool(), {
			schema: {
				...usersSchema,
				...todosSchema,
			},
		});
	}
	return dbInstance;
}

// Export pool and db as getters that lazily initialize
export const pool: Pool = new Proxy({} as Pool, {
	get(_target, prop) {
		return getPool()[prop as keyof Pool];
	},
	set(_target, prop, value) {
		(getPool() as any)[prop] = value;
		return true;
	},
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		return getDb()[prop as keyof ReturnType<typeof drizzle>];
	},
	set(_target, prop, value) {
		(getDb() as any)[prop] = value;
		return true;
	},
});

export { usersSchema, todosSchema };

/**
 * Reset database connections (useful for tests)
 * This will close existing connections and force recreation
 */
export function resetDatabaseConnections(): void {
	if (poolInstance && !poolInstance.ended) {
		poolInstance.end().catch(() => {
			// Ignore errors during cleanup
		});
	}
	poolInstance = null;
	dbInstance = null;
}
