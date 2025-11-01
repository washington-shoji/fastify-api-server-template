import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { todos } from '../../src/db/schema/todos.js';
import { users as usersTable } from '../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import type { FastifyInstance } from 'fastify';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';
import { resetDatabaseConnections } from '../../src/db/index.js';
import { buildServer } from '../../src/server.js';

describe('Todo Endpoints', () => {
	let app: FastifyInstance;
	let testDb: ReturnType<typeof createTestDb>;
	let testUserId: string;
	let testUserAccessToken: string;

	beforeAll(async () => {
		// Reset database connections to ensure we use the test database URL
		// (which was set in setup.ts beforeAll)
		resetDatabaseConnections();

		app = await buildServer();
		testDb = createTestDb();
	});

	beforeEach(async () => {
		// Clean database before each test
		await cleanTestDatabase();

		// Create a test user
		testUserId = uuidv7();
		await testDb.insert(usersTable).values({
			id: testUserId,
			userName: `test_user_${Date.now()}`,
			email: `test_${Date.now()}@example.com`,
			password: 'test_password_123',
		});

		// Issue access token for authentication
		const tokenResponse = await app.inject({
			method: 'POST',
			url: '/v1/auth/token',
			payload: {
				userId: testUserId,
			},
		});

		expect(tokenResponse.statusCode).toBe(200);
		const tokenBody = JSON.parse(tokenResponse.body);
		testUserAccessToken = tokenBody.accessToken;
		expect(testUserAccessToken).toBeTruthy();
	});

	afterAll(async () => {
		// Close Fastify server (this will trigger onClose hooks, including DB pool cleanup)
		if (app) {
			try {
				await app.close();
			} catch (error) {
				// Ignore errors during cleanup
				console.warn('Error closing Fastify app:', error);
			}
		}
	});

	it('should create a todo', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/v1/todos',
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
			payload: {
				title: 'Test Todo',
				description: 'Test Description',
				completed: false,
			},
		});

		expect(response.statusCode).toBe(201);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('id');
		expect(body).toHaveProperty('title', 'Test Todo');
		expect(body).toHaveProperty('description', 'Test Description');
		expect(body).toHaveProperty('completed', false);
		expect(body).not.toHaveProperty('user_id'); // Security: user_id never exposed
	});

	it('should get all todos for authenticated user', async () => {
		// Create a few todos
		await testDb
			.insert(todos)
			.values({
				id: uuidv7(),
				userId: testUserId,
				title: 'Todo 1',
				description: null,
				completed: false,
			})
			.returning();

		await testDb
			.insert(todos)
			.values({
				id: uuidv7(),
				userId: testUserId,
				title: 'Todo 2',
				description: 'Description 2',
				completed: true,
			})
			.returning();

		const response = await app.inject({
			method: 'GET',
			url: '/v1/todos',
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('hasMore');
		expect(body).toHaveProperty('count');
		expect(body.items.length).toBeGreaterThanOrEqual(2);
	});

	it('should get a todo by ID', async () => {
		const todo = await testDb
			.insert(todos)
			.values({
				id: uuidv7(),
				userId: testUserId,
				title: 'Get Me Todo',
				description: 'Description',
				completed: false,
			})
			.returning();

		const response = await app.inject({
			method: 'GET',
			url: `/v1/todos/${todo[0].id}`,
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('id', todo[0].id);
		expect(body).toHaveProperty('title', 'Get Me Todo');
		expect(body).not.toHaveProperty('user_id');
	});

	it('should update a todo', async () => {
		const todo = await testDb
			.insert(todos)
			.values({
				id: uuidv7(),
				userId: testUserId,
				title: 'Update Me Todo',
				description: 'Original',
				completed: false,
			})
			.returning();

		const response = await app.inject({
			method: 'PUT',
			url: `/v1/todos/${todo[0].id}`,
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
			payload: {
				title: 'Updated Title',
				completed: true,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body).toHaveProperty('title', 'Updated Title');
		expect(body).toHaveProperty('completed', true);
	});

	it('should delete a todo', async () => {
		const todo = await testDb
			.insert(todos)
			.values({
				id: uuidv7(),
				userId: testUserId,
				title: 'Delete Me Todo',
				description: null,
				completed: false,
			})
			.returning();

		const response = await app.inject({
			method: 'DELETE',
			url: `/v1/todos/${todo[0].id}`,
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
		});

		expect(response.statusCode).toBe(204);
	});

	it('should return 404 for non-existent todo', async () => {
		const nonExistentId = uuidv7();
		const response = await app.inject({
			method: 'GET',
			url: `/v1/todos/${nonExistentId}`,
			headers: {
				Authorization: `Bearer ${testUserAccessToken}`,
			},
		});

		expect(response.statusCode).toBe(404);
	});

	it('should return 401 for unauthenticated requests', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/v1/todos',
		});

		expect(response.statusCode).toBe(401);
	});
});
