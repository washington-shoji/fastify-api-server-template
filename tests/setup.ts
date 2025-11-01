import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import {
	startTestDatabase,
	stopTestDatabase,
	getTestDbUrl,
} from './helpers/testDb.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Store original DATABASE_URL
const originalDatabaseUrl = process.env.DATABASE_URL;

// Global test database URL - will be set by beforeAll
let globalTestDbUrl: string | null = null;

// Setup before all tests
beforeAll(async () => {
	console.log('Test setup started - initializing test database container...');

	// Start test container and get connection URL
	globalTestDbUrl = await startTestDatabase();

	// Override DATABASE_URL for tests to use test container
	// This must be set BEFORE any modules that read DATABASE_URL are imported
	process.env.DATABASE_URL = globalTestDbUrl;

	console.log('Test database container ready');
}, 60000); // 60 second timeout for container startup

// Cleanup after all tests
afterAll(async () => {
	console.log('Test cleanup - stopping test database container...');

	// Restore original DATABASE_URL
	if (originalDatabaseUrl) {
		process.env.DATABASE_URL = originalDatabaseUrl;
	} else {
		delete process.env.DATABASE_URL;
	}

	// Stop test container
	await stopTestDatabase();

	globalTestDbUrl = null;

	console.log('Test cleanup completed');
}, 30000); // 30 second timeout for container shutdown

// Export function to get test database URL
export function getTestDatabaseUrl(): string | null {
	return globalTestDbUrl;
}
