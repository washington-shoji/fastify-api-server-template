import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { users } from '../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import type { FastifyInstance } from 'fastify';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';
import { resetDatabaseConnections } from '../../src/db/index.js';
import { buildServer } from '../../src/server.js';
import { hashPassword } from '../../src/utils/password.js';

describe('Authentication Endpoints', () => {
	let app: FastifyInstance;
	let testUserId: string;
	let testUserName: string;
	let testEmail: string;
	let testPassword: string;
	let testDb: ReturnType<typeof createTestDb>;

	beforeAll(async () => {
		// Reset database connections to ensure we use the test database URL
		// (which was set in setup.ts beforeAll)
		resetDatabaseConnections();

		// Build server with test database (already set up in setup.ts)
		app = await buildServer();
		testDb = createTestDb();
	});

	beforeEach(async () => {
		// Clean database before each test for isolation
		await cleanTestDatabase();

		// Generate fresh test user data for each test
		testUserId = uuidv7();
		testUserName = `test_user_${Date.now()}`;
		testEmail = `test_${Date.now()}@example.com`;
		testPassword = 'test_password_123';

		// Create a fresh test user with hashed password
		const hashedPassword = await hashPassword(testPassword);
		await testDb.insert(users).values({
			id: testUserId,
			userName: testUserName,
			email: testEmail,
			password: hashedPassword,
		});
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

	describe('POST /v1/auth/register', () => {
		it('should register a new user successfully', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/register',
				payload: {
					user_name: 'new_user',
					email: 'newuser@example.com',
					password: 'password123',
				},
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('accessToken');
			expect(body).toHaveProperty('refreshToken');
			expect(typeof body.accessToken).toBe('string');
			expect(typeof body.refreshToken).toBe('string');

			// Check cookies are set
			const cookies = response.cookies;
			expect(cookies).toHaveLength(2);
			expect(cookies.some((c) => c.name === 'access_token')).toBe(true);
			expect(cookies.some((c) => c.name === 'refresh_token')).toBe(true);
		});

		it('should return 400 for invalid registration data', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/register',
				payload: {
					user_name: '',
					email: 'invalid-email',
					password: 'short',
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for duplicate email', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/register',
				payload: {
					user_name: 'different_user',
					email: testEmail, // Use existing email
					password: 'password123',
				},
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.body);
			expect(body.message).toContain('Email already exists');
		});

		it('should return 400 for duplicate username', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/register',
				payload: {
					user_name: testUserName, // Use existing username
					email: 'different@example.com',
					password: 'password123',
				},
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.body);
			expect(body.message).toContain('Username already exists');
		});
	});

	describe('POST /v1/auth/login', () => {
		it('should login with email successfully', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/login',
				payload: {
					identifier: testEmail,
					password: testPassword,
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('accessToken');
			expect(body).toHaveProperty('refreshToken');

			// Check cookies are set
			const cookies = response.cookies;
			expect(cookies).toHaveLength(2);
			expect(cookies.some((c) => c.name === 'access_token')).toBe(true);
			expect(cookies.some((c) => c.name === 'refresh_token')).toBe(true);
		});

		it('should login with username successfully', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/login',
				payload: {
					identifier: testUserName,
					password: testPassword,
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('accessToken');
			expect(body).toHaveProperty('refreshToken');
		});

		it('should return 400 for invalid login data', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/login',
				payload: {
					identifier: '',
					password: '',
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return 401 for invalid credentials (wrong password)', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/login',
				payload: {
					identifier: testEmail,
					password: 'wrong_password',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toContain('Invalid credentials');
		});

		it('should return 401 for invalid credentials (non-existent user)', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/login',
				payload: {
					identifier: 'nonexistent@example.com',
					password: 'password123',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toContain('Invalid credentials');
		});
	});

	describe('POST /v1/auth/logout', () => {
		it('should logout successfully', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/logout',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('Logged out successfully');

			// Check cookies are cleared
			const cookies = response.cookies;
			const accessTokenCookie = cookies.find((c) => c.name === 'access_token');
			const refreshTokenCookie = cookies.find(
				(c) => c.name === 'refresh_token'
			);
			expect(accessTokenCookie?.value).toBe('');
			expect(refreshTokenCookie?.value).toBe('');
		});
	});

	describe('POST /v1/auth/token', () => {
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
});
