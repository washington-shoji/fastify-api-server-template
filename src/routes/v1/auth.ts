import type { FastifyInstance } from 'fastify';
import { createUserRepository } from '../../repositories/userRepository.js';
import { createAuthService } from '../../services/authService.js';
import { createAuthController } from '../../controllers/authController.js';
import {
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
	});
	const controller = createAuthController(app, service);

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
