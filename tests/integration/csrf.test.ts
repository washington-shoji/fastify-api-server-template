/**
 * CSRF Protection Integration Tests
 *
 * These tests verify that CSRF protection works correctly when enabled.
 * Note: CSRF is disabled in test mode by default, so we need to enable it
 * explicitly for these tests by setting ENABLE_CSRF=true and NODE_ENV != 'test'.
 *
 * IMPORTANT: Environment variables must be set BEFORE importing modules that
 * read them, since env.ts evaluates at module load time.
 */

// Set environment variables BEFORE importing any modules
// This ensures env.ENABLE_CSRF is true when the module loads
const originalEnableCSRF = process.env.ENABLE_CSRF;
const originalNodeEnv = process.env.NODE_ENV;

// Enable CSRF for these tests
process.env.ENABLE_CSRF = 'true';
// Set NODE_ENV to something other than 'test' to enable CSRF
// CSRF middleware checks: !env.ENABLE_CSRF || process.env.NODE_ENV === 'test'
process.env.NODE_ENV = 'development';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { users } from '../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import type { FastifyInstance } from 'fastify';
import { cleanTestDatabase, createTestDb } from '../helpers/testDb.js';
import { resetDatabaseConnections } from '../../src/db/index.js';
import { buildServer } from '../../src/server.js';
import { hashPassword } from '../../src/utils/password.js';
describe('CSRF Protection', () => {
	let app: FastifyInstance;
	let testDb: ReturnType<typeof createTestDb>;
	let testUserId: string;
	let testUserAccessToken: string;
	let csrfToken: string;

	beforeAll(async () => {
		// Reset database connections
		resetDatabaseConnections();

		// Build server with CSRF enabled
		// Environment variables were set before imports, so env.ENABLE_CSRF should be true
		app = await buildServer();
		testDb = createTestDb();
	});

	beforeEach(async () => {
		// Clean database before each test
		await cleanTestDatabase();

		// Create a test user
		testUserId = uuidv7();
		const testPassword = 'test_password_123';
		const testEmail = `test_${Date.now()}@example.com`;
		const testUserName = `test_user_${Date.now()}`;
		const hashedPassword = await hashPassword(testPassword);
		await testDb.insert(users).values({
			id: testUserId,
			userName: testUserName,
			email: testEmail,
			password: hashedPassword,
		});

		// Use login to get access token and CSRF token
		// Login endpoint is excluded from CSRF, so we can use it to get tokens
		const loginResponse = await app.inject({
			method: 'POST',
			url: '/v1/auth/login',
			payload: {
				identifier: testEmail,
				password: testPassword,
			},
		});

		expect(loginResponse.statusCode).toBe(200);
		const loginBody = JSON.parse(loginResponse.body);
		testUserAccessToken = loginBody.accessToken;

		// Extract CSRF token from cookies
		const loginCookies = loginResponse.cookies;
		const csrfCookie = loginCookies.find(c => c.name === 'csrf_token');
		expect(csrfCookie).toBeDefined();
		csrfToken = csrfCookie!.value;
		expect(csrfToken).toBeTruthy();
	});

	afterAll(async () => {
		// Restore original environment variables
		if (originalEnableCSRF !== undefined) {
			process.env.ENABLE_CSRF = originalEnableCSRF;
		} else {
			delete process.env.ENABLE_CSRF;
		}

		if (originalNodeEnv !== undefined) {
			process.env.NODE_ENV = originalNodeEnv;
		} else {
			process.env.NODE_ENV = 'test';
		}

		// Close Fastify server
		if (app) {
			try {
				await app.close();
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	describe('Safe HTTP Methods (GET, HEAD, OPTIONS)', () => {
		it('should allow GET requests without CSRF token', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
				},
			});

			expect(response.statusCode).toBe(200);
		});

		it('should allow HEAD requests without CSRF token', async () => {
			const response = await app.inject({
				method: 'HEAD',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
				},
			});

			// HEAD requests don't return body, just check status
			expect([200, 204]).toContain(response.statusCode);
		});
	});

	describe('State-changing Requests (POST, PUT, DELETE)', () => {
		it('should require CSRF token for POST requests', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					// No CSRF token header
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should accept POST requests with valid CSRF token', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('id');
			expect(body).toHaveProperty('title', 'Test Todo');
		});

		it('should require CSRF token for PUT requests', async () => {
			// First create a todo
			const createResponse = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			const todo = JSON.parse(createResponse.body);

			// Try to update without CSRF token
			const response = await app.inject({
				method: 'PUT',
				url: `/v1/todos/${todo.id}`,
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					// No CSRF token header
				},
				payload: {
					title: 'Updated Title',
					completed: true,
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should accept PUT requests with valid CSRF token', async () => {
			// First create a todo
			const createResponse = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			const todo = JSON.parse(createResponse.body);

			// Update with CSRF token
			const response = await app.inject({
				method: 'PUT',
				url: `/v1/todos/${todo.id}`,
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
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

		it('should require CSRF token for DELETE requests', async () => {
			// First create a todo
			const createResponse = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			const todo = JSON.parse(createResponse.body);

			// Try to delete without CSRF token
			const response = await app.inject({
				method: 'DELETE',
				url: `/v1/todos/${todo.id}`,
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					// No CSRF token header
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should accept DELETE requests with valid CSRF token', async () => {
			// First create a todo
			const createResponse = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			const todo = JSON.parse(createResponse.body);

			// Delete with CSRF token
			const response = await app.inject({
				method: 'DELETE',
				url: `/v1/todos/${todo.id}`,
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
			});

			expect(response.statusCode).toBe(204);
		});
	});

	describe('CSRF Token Validation', () => {
		it('should reject requests with mismatched CSRF tokens', async () => {
			const wrongToken = 'wrong_token_value';

			const response = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': wrongToken, // Wrong token in header
				},
				cookies: {
					csrf_token: csrfToken, // Correct token in cookie
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('Invalid CSRF token');
		});

		it('should reject requests with missing CSRF cookie', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
					// No CSRF cookie
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should reject requests with missing CSRF header', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					// No CSRF header
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo',
					description: 'Test Description',
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should accept requests with CSRF token in alternative header names', async () => {
			// Test with 'csrf-token' header
			const response1 = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo 1',
					description: 'Test Description',
				},
			});

			expect(response1.statusCode).toBe(201);

			// Test with 'x-xsrf-token' header
			const response2 = await app.inject({
				method: 'POST',
				url: '/v1/todos',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-xsrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
				payload: {
					title: 'Test Todo 2',
					description: 'Test Description',
				},
			});

			expect(response2.statusCode).toBe(201);
		});
	});

	describe('Public Endpoints (Register/Login)', () => {
		it('should allow POST /v1/auth/register without CSRF token', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/register',
				payload: {
					user_name: `new_user_${Date.now()}`,
					email: `newuser_${Date.now()}@example.com`,
					password: 'password123',
				},
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('accessToken');
			expect(body).toHaveProperty('refreshToken');

			// Verify CSRF token is set after registration
			const cookies = response.cookies;
			expect(cookies.some(c => c.name === 'csrf_token')).toBe(true);
		});

		it('should allow POST /v1/auth/login without CSRF token', async () => {
			const testPassword = 'test_password_123';
			const testEmail = `test_${Date.now()}@example.com`;
			const testUserName = `test_user_${Date.now()}`;

			// Create user first
			const hashedPassword = await hashPassword(testPassword);
			await testDb.insert(users).values({
				id: uuidv7(),
				userName: testUserName,
				email: testEmail,
				password: hashedPassword,
			});

			// Login without CSRF token
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

			// Verify CSRF token is set after login
			const cookies = response.cookies;
			expect(cookies.some(c => c.name === 'csrf_token')).toBe(true);
		});
	});

	describe('Logout Endpoint', () => {
		it('should require CSRF token for POST /v1/auth/logout', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/logout',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					// No CSRF token
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('CSRF token required');
		});

		it('should accept POST /v1/auth/logout with valid CSRF token', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/v1/auth/logout',
				headers: {
					Authorization: `Bearer ${testUserAccessToken}`,
					'x-csrf-token': csrfToken,
				},
				cookies: {
					csrf_token: csrfToken,
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.message).toBe('Logged out successfully');

			// Verify cookies are cleared
			const cookies = response.cookies;
			const accessTokenCookie = cookies.find(c => c.name === 'access_token');
			const refreshTokenCookie = cookies.find(c => c.name === 'refresh_token');
			const csrfTokenCookie = cookies.find(c => c.name === 'csrf_token');
			expect(accessTokenCookie?.value).toBe('');
			expect(refreshTokenCookie?.value).toBe('');
			expect(csrfTokenCookie?.value).toBe('');
		});
	});

	describe('Excluded Endpoints', () => {
		it('should allow POST to /health endpoints without CSRF token', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/health',
				// No CSRF token
			});

			// Health endpoint might return 404 for POST, but shouldn't be blocked by CSRF
			expect([200, 404, 405]).toContain(response.statusCode);
			expect(response.statusCode).not.toBe(401);
		});

		it('should allow requests to /docs endpoints without CSRF token', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/docs',
				// No CSRF token
			});

			// Docs endpoint should be accessible (may redirect 302, or return 200/404)
			expect([200, 302, 404]).toContain(response.statusCode);
			expect(response.statusCode).not.toBe(401);
		});

		it('should allow requests to /ui endpoints without CSRF token', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/ui',
				// No CSRF token
			});

			// UI endpoint should be accessible
			expect(response.statusCode).toBe(200);
		});
	});
});
