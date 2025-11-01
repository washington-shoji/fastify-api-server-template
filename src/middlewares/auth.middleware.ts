import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware to extract and validate user ID from authenticated request
 * This eliminates repetitive user ID extraction code in controllers
 */
export function setupAuthMiddleware(app: FastifyInstance) {
	// Hook to extract userId from request.user after authentication
	// Use 'preHandler' hook which runs AFTER preValidation (where authenticate runs)
	// This ensures request.user is set by jwtVerify before we extract userId
	app.addHook(
		'preHandler',
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Only process authenticated requests (request.user is set by jwtVerify)
			if (request.user) {
				const userId = (request.user as { sub?: string })?.sub;
				if (userId) {
					// Attach userId to request for easy access in handlers
					(request as any).userId = userId;
				}
			}
		}
	);
}

/**
 * Guard middleware to ensure request is authenticated and has userId
 * Use this in routes that require authentication
 */
export async function requireAuth(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	const userId = (request as any).userId;
	if (!userId) {
		throw new UnauthorizedError();
	}
}
