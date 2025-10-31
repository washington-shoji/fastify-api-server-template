import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Request ID middleware for correlation tracking
 * Adds a unique request ID to each request for logging and tracing
 */
export function setupRequestIdMiddleware(app: FastifyInstance) {
	// Generate request ID and attach to request/reply headers
	app.addHook(
		'onRequest',
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Check if request ID already exists (from upstream)
			const existingRequestId =
				(request.headers['x-request-id'] as string) ||
				(request.headers['x-correlation-id'] as string);

			const requestId = existingRequestId || randomUUID();

			// Attach to request object for logging
			(request as any).requestId = requestId;

			// Set response header
			reply.header('X-Request-ID', requestId);
		}
	);
}
