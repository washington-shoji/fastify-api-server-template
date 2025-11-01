/**
 * Example: Auth routes using DI container pattern
 * This is an alternative to manual dependency wiring
 *
 * To use this pattern:
 * 1. Register services in server.ts: registerServices(app)
 * 2. Import getAuthController from './di/services.js' instead of manual wiring
 * 3. Use this file as a reference or replace auth.ts with this implementation
 */

import type { FastifyInstance } from 'fastify';
import { getAuthController } from '../../di/services.js';
import {
	issueTokenSchema,
	tokenResponseSchema,
	refreshTokenSchema,
	userResponseSchema,
	errorResponseSchema,
} from '../../utils/schemas.js';

/**
 * Version 1 Auth routes using DI container
 * API versioning strategy: /v1/auth
 */
export async function authV1RoutesDI(app: FastifyInstance) {
	// Get controller from DI container instead of manual wiring
	const controller = getAuthController();

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
