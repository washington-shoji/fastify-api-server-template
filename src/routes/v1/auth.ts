import type { FastifyInstance } from 'fastify';
import { createUserRepository } from '../../repositories/userRepository.js';
import { createAuthService } from '../../services/authService.js';
import { createAuthController } from '../../controllers/authController.js';
import {
	registerSchema,
	loginSchema,
	issueTokenSchema,
	tokenResponseSchema,
	refreshTokenSchema,
	userResponseSchema,
	errorResponseSchema,
} from '../../utils/schemas.js';

/**
 * Version 1 Auth routes
 * API versioning strategy: /v1/auth
 */
export async function authV1Routes(app: FastifyInstance) {
	const repo = createUserRepository(app);
	const service = createAuthService(app, {
		getUserById: (id) => repo.getById(id),
		getUserByEmail: (email) => repo.getByEmail(email),
		getUserByUserName: (userName) => repo.getByUserName(userName),
		createUser: (data) => repo.create(data),
	});
	const controller = createAuthController(app, service);

	app.post(
		'/v1/auth/register',
		{
			schema: {
				description: 'Register a new user',
				tags: ['auth'],
				body: registerSchema,
				response: {
					201: tokenResponseSchema,
					400: errorResponseSchema,
				},
			},
		},
		controller.registerHandler
	);

	app.post(
		'/v1/auth/login',
		{
			schema: {
				description: 'Login with email/username and password',
				tags: ['auth'],
				body: loginSchema,
				response: {
					200: tokenResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
				},
			},
		},
		controller.loginHandler
	);

	app.post(
		'/v1/auth/logout',
		{
			schema: {
				description: 'Logout and clear authentication cookies',
				tags: ['auth'],
				response: {
					200: {
						type: 'object',
						properties: {
							message: {
								type: 'string',
								description: 'Success message',
							},
						},
						required: ['message'],
					},
				},
			},
		},
		controller.logoutHandler
	);

	app.post(
		'/v1/auth/token',
		{
			schema: {
				description: 'Issue access and refresh tokens for a user',
				tags: ['auth'],
				body: issueTokenSchema,
				response: {
					200: tokenResponseSchema,
					400: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		controller.issueTokenHandler
	);

	app.post(
		'/v1/auth/refresh',
		{
			schema: {
				description: 'Refresh access and refresh tokens',
				tags: ['auth'],
				body: refreshTokenSchema,
				response: {
					200: tokenResponseSchema,
					401: errorResponseSchema,
				},
			},
		},
		controller.refreshHandler
	);

	app.get(
		'/v1/auth/me',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Get current authenticated user info',
				tags: ['auth'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				response: {
					200: {
						type: 'object',
						properties: {
							user: userResponseSchema,
						},
						required: ['user'],
					},
					401: errorResponseSchema,
				},
			},
		},
		controller.meHandler
	);
}
