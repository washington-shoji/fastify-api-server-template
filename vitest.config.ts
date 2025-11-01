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
			],
		},
		testTimeout: 10000,
		setupFiles: ['./tests/setup.ts'],
	},
});
