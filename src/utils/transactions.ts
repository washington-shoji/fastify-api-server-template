import type { FastifyInstance } from 'fastify';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { pool as globalPool } from '../db/index.js';
import * as usersSchema from '../db/schema/users.js';
import * as todosSchema from '../db/schema/todos.js';

/**
 * Transaction utilities for multi-step database operations
 * Ensures data consistency by wrapping operations in database transactions
 */

/**
 * Execute a function within a database transaction
 * The function receives a Drizzle database instance that uses a single connection
 * All queries within the transaction will be executed atomically
 */
export async function withTransaction<T>(
	pool: Pool,
	callback: (txDb: NodePgDatabase<any>) => Promise<T>
): Promise<T> {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Create a new Drizzle instance using the transaction client
		const txDb = drizzle(client, {
			schema: {
				...usersSchema,
				...todosSchema,
			},
		}) as NodePgDatabase<any>;

		try {
			const result = await callback(txDb);
			await client.query('COMMIT');
			return result;
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	} finally {
		client.release();
	}
}

/**
 * Execute a function within a database transaction using Fastify app instance
 */
export async function withTransactionFromApp<T>(
	app: FastifyInstance,
	callback: (txDb: NodePgDatabase<any>) => Promise<T>
): Promise<T> {
	// Use the global pool from db/index.ts
	return withTransaction(globalPool, callback);
}
