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

// Setup before all tests
beforeAll(async () => {
	console.log('Test setup started - initializing test database container...');

	// Start test container and get connection URL
	const testDbUrl = await startTestDatabase();

	// Override DATABASE_URL for tests to use test container
	process.env.DATABASE_URL = testDbUrl;

	console.log('Test database container ready');
}, 60000); // 60 second timeout for container startup

// Cleanup after all tests
afterAll(async () => {
	console.log('Test cleanup - stopping test database container...');

	// Restore original DATABASE_URL
	if (originalDatabaseUrl) {
		process.env.DATABASE_URL = originalDatabaseUrl;
	}

	// Stop test container
	await stopTestDatabase();

	console.log('Test cleanup completed');
}, 30000); // 30 second timeout for container shutdown
