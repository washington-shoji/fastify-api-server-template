import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Setup before all tests
beforeAll(async () => {
	// Test setup code here (e.g., database connection, test data seeding)
	console.log('Test setup started');
});

// Cleanup after all tests
afterAll(async () => {
	// Cleanup code here (e.g., close database connections, clean test data)
	console.log('Test cleanup completed');
});

