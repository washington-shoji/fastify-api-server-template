import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Health Check Endpoints', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await buildServer();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('should return 200 for /health/live endpoint', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/health/live',
		});

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toHaveProperty('status', 'ok');
	});

	it('should return 200 for /health endpoint with database check', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/health',
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('status');
		expect(body).toHaveProperty('checks');
	});

	it('should return 200 for /health/ready endpoint', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/health/ready',
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('status');
	});
});
