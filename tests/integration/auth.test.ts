import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/server.js';
import { users } from '../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Authentication Endpoints', () => {
	let app: FastifyInstance;
	let testUserId: string;

	beforeAll(async () => {
		app = await buildServer();
		// Create a test user
		testUserId = uuidv7();
		await app.db.insert(users).values({
			id: testUserId,
			userName: `test_user_${Date.now()}`,
			email: `test_${Date.now()}@example.com`,
			password: 'test_password_123',
		});
	});

	afterAll(async () => {
		// Clean up test user
		if (testUserId && app) {
			await app.db.delete(users).where(eq(users.id, testUserId));
		}
		if (app) {
			await app.close();
		}
	});

	it('should issue tokens for valid user', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/auth/token',
			payload: {
				userId: testUserId,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('accessToken');
		expect(body).toHaveProperty('refreshToken');
	});

	it('should return 400 for invalid token request', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/auth/token',
			payload: {
				userId: '',
			},
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 404 for non-existent user', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/auth/token',
			payload: {
				userId: uuidv7(), // Non-existent user ID
			},
		});

		expect(response.statusCode).toBe(404); // User not found
	});
});
