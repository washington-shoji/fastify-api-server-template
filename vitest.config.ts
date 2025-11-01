import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/db/migrate.ts',
				'src/server.ts',
				'**/*.config.ts',
				'**/*.d.ts',
				'tests/**',
			],
		},
		testTimeout: 30000, // Increased for testcontainer startup
		setupFiles: ['./tests/setup.ts'],
		hookTimeout: 60000, // Timeout for beforeAll/afterAll hooks (container startup)
		// Ensure setupFiles run before test files are loaded
		sequence: {
			setupFiles: 'list', // Run setup files in sequence
			shuffle: false,
		},
	},
});
