/**
 * Test Database Setup using Testcontainers
 * Creates an isolated PostgreSQL container for each test run
 */

import {
	PostgreSqlContainer,
	StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from '../../src/db/migrate.js';
import * as usersSchema from '../../src/db/schema/users.js';
import * as todosSchema from '../../src/db/schema/todos.js';

let container: StartedPostgreSqlContainer | null = null;
let pool: Pool | null = null;
let testDbUrl: string | null = null;

/**
 * Start a PostgreSQL test container
 * Returns the database connection URL
 */
export async function startTestDatabase(): Promise<string> {
	if (container && testDbUrl) {
		return testDbUrl;
	}

	console.log('Starting PostgreSQL test container...');

	container = await new PostgreSqlContainer('postgres:15-alpine')
		.withDatabase('test_db')
		.withUsername('test_user')
		.withPassword('test_password')
		.start();

	testDbUrl = container.getConnectionUri();
	console.log(`Test database started at: ${testDbUrl}`);

	// Create pool for migrations
	pool = new Pool({
		connectionString: testDbUrl,
		max: 1,
	});

	// Run migrations on test database
	console.log('Running migrations on test database...');
	try {
		await migrate(testDbUrl);
		console.log('Migrations completed successfully');
	} catch (error) {
		console.error('Migration error:', error);
		throw error;
	}

	return testDbUrl;
}

/**
 * Stop the test database container
 */
export async function stopTestDatabase(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}

	if (container) {
		await container.stop();
		container = null;
		testDbUrl = null;
		console.log('Test database container stopped');
	}
}

/**
 * Get the test database connection URL
 */
export function getTestDbUrl(): string {
	if (!testDbUrl) {
		throw new Error(
			'Test database not started. Call startTestDatabase() first.'
		);
	}
	return testDbUrl;
}

/**
 * Create a Drizzle database instance for testing
 */
export function createTestDb() {
	if (!testDbUrl) {
		throw new Error(
			'Test database not started. Call startTestDatabase() first.'
		);
	}

	return drizzle(testDbUrl, {
		schema: {
			...usersSchema,
			...todosSchema,
		},
	});
}

/**
 * Clean all tables in the test database
 * Useful for cleaning between tests
 */
export async function cleanTestDatabase(): Promise<void> {
	if (!pool) {
		throw new Error('Test database pool not initialized');
	}

	// Truncate all tables except drizzle migrations (faster than delete)
	await pool.query(`
		DO $$ 
		DECLARE 
			r RECORD;
		BEGIN
			FOR r IN (
				SELECT tablename 
				FROM pg_tables 
				WHERE schemaname = 'public' 
				AND tablename != '__drizzle_migrations'
			) 
			LOOP
				EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
			END LOOP;
		END $$;
	`);
}
