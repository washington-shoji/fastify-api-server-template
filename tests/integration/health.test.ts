import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

describe('Health Check Endpoints', () => {
	it('should return 200 for /health/live endpoint', async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: 'GET',
			url: '/health/live',
		});

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toHaveProperty('status', 'ok');
		await app.close();
	});

	it('should return 200 for /health endpoint with database check', async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: 'GET',
			url: '/health',
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('status');
		expect(body).toHaveProperty('checks');
		await app.close();
	});

	it('should return 200 for /health/ready endpoint', async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: 'GET',
			url: '/health/ready',
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('status');
		await app.close();
	});
});
