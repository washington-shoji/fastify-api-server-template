import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { startTestDatabase, stopTestDatabase } from './helpers/testDb.js';
import { closeDatabaseConnections } from '../src/db/index.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Store original DATABASE_URL
const originalDatabaseUrl = process.env.DATABASE_URL;

// Global test database URL - will be set by beforeAll
let globalTestDbUrl: string | null = null;

// Helper function to check if error is a connection termination error
function isConnectionTerminationError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;

	const err = error as any;

	// Check error code (PostgreSQL error code 57P01)
	if (err.code === '57P01') return true;

	// Check error message
	if (
		err.message &&
		typeof err.message === 'string' &&
		(err.message.includes(
			'terminating connection due to administrator command'
		) ||
			err.message.includes('57P01'))
	) {
		return true;
	}

	return false;
}

// Suppress connection termination errors during test cleanup
// These are expected when the container shuts down while connections are closing
// This prevents CI/CD pipelines from failing due to expected cleanup errors
process.on('unhandledRejection', error => {
	// Suppress connection termination errors during cleanup
	if (isConnectionTerminationError(error)) {
		// Silently ignore these expected cleanup errors
		return;
	}
	// Re-throw other unhandled rejections
	Promise.reject(error);
});

// Also handle uncaught exceptions (pg errors can come through here synchronously)
process.on('uncaughtException', error => {
	// Suppress connection termination errors during cleanup
	if (isConnectionTerminationError(error)) {
		// Silently ignore these expected cleanup errors
		return;
	}
	// Re-throw other uncaught exceptions
	throw error;
});

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
	console.log('Test cleanup - closing database connections...');

	try {
		// Close all database connections gracefully before stopping container
		// This prevents "terminating connection due to administrator command" errors
		await closeDatabaseConnections();

		// Small delay to ensure all connections are fully closed
		await new Promise(resolve => setTimeout(resolve, 100));

		console.log('Database connections closed successfully');
	} catch (error) {
		// Ignore cleanup errors (connections may already be closed)
		console.warn('Error during database connection cleanup:', error);
	}

	// Restore original DATABASE_URL
	if (originalDatabaseUrl) {
		process.env.DATABASE_URL = originalDatabaseUrl;
	} else {
		delete process.env.DATABASE_URL;
	}

	console.log('Test cleanup - stopping test database container...');
	try {
		// Stop test container
		await stopTestDatabase();
		console.log('Test database container stopped successfully');
	} catch (error) {
		// Log but don't fail the test suite if container cleanup fails
		// Suppress connection termination errors (expected during container shutdown)
		if (
			!(error instanceof Error) ||
			!error.message.includes(
				'terminating connection due to administrator command'
			)
		) {
			console.warn('Error during container cleanup:', error);
		}
	}

	globalTestDbUrl = null;

	console.log('Test cleanup completed');
}, 30000); // 30 second timeout for container shutdown

// Export function to get test database URL
export function getTestDatabaseUrl(): string | null {
	return globalTestDbUrl;
}
