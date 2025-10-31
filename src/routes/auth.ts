import type { FastifyInstance } from 'fastify';
import { createUserRepository } from '../repositories/userRepository.js';
import { createAuthService } from '../services/authService.js';
import { createAuthController } from '../controllers/authController.js';

export async function authRoutes(app: FastifyInstance) {
	const repo = createUserRepository(app);
	const service = createAuthService(app, {
		getUserById: (id) => repo.getById(id),
	});
	const controller = createAuthController(app, service);

	app.post('/auth/token', controller.issueTokenHandler);
	app.post('/auth/refresh', controller.refreshHandler);
	app.get(
		'/auth/me',
		{ preValidation: [app.authenticate] },
		controller.meHandler
	);
}
