import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../src/server.js';
import { users } from '../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';

describe('Authentication Endpoints', () => {
	let app: FastifyInstance;
	let testUserId: string;
	let testDb: ReturnType<typeof createTestDb>;

	beforeAll(async () => {
		// Build server with test database (already set up in setup.ts)
		app = await buildServer();
		testDb = createTestDb();
	});

	beforeEach(async () => {
		// Clean database before each test for isolation
		await cleanTestDatabase();

		// Create a fresh test user for each test
		testUserId = uuidv7();
		await testDb.insert(users).values({
			id: testUserId,
			userName: `test_user_${Date.now()}`,
			email: `test_${Date.now()}@example.com`,
			password: 'test_password_123',
		});
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('should issue tokens for valid user', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/v1/auth/token',
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
			url: '/v1/auth/token',
			payload: {
				userId: '',
			},
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 404 for non-existent user', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/v1/auth/token',
			payload: {
				userId: uuidv7(), // Non-existent user ID
			},
		});

		expect(response.statusCode).toBe(404); // User not found
	});
});
