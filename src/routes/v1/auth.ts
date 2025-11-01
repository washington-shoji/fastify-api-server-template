import type { FastifyInstance } from 'fastify';
import { createUserRepository } from '../../repositories/userRepository.js';
import { createAuthService } from '../../services/authService.js';
import { createAuthController } from '../../controllers/authController.js';

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

	app.post('/v1/auth/token', controller.issueTokenHandler);
	app.post('/v1/auth/refresh', controller.refreshHandler);
	app.get(
		'/v1/auth/me',
		{ preValidation: [app.authenticate] },
		controller.meHandler
	);
}
