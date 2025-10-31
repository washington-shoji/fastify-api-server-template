import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ValidationError } from './errors.js';

/**
 * Global error handler for Fastify
 * Handles all errors consistently across the application
 */
export function setupErrorHandler(app: FastifyInstance) {
	app.setErrorHandler(
		async (
			error: Error | AppError,
			request: FastifyRequest,
			reply: FastifyReply
		) => {
			// Log error for debugging with request ID
			const requestId = (request as any).requestId;
			request.log.error(
				{
					url: request.url,
					method: request.method,
					statusCode: reply.statusCode,
					requestId,
					error: error.message,
					stack: error.stack,
				},
				error.message || 'Error occurred'
			);

			// Handle known application errors
			if (error instanceof AppError) {
				return reply.code(error.statusCode).send({
					message: error.message,
					...(error instanceof ValidationError && error.errors
						? { errors: error.errors }
						: {}),
				});
			}

			// Handle Zod validation errors
			if (error.name === 'ZodError' && 'issues' in error) {
				const zodError = error as {
					issues: Array<{ path: string[]; message: string }>;
				};
				return reply.code(400).send({
					message: 'Validation failed',
					errors: zodError.issues.map((issue) => ({
						path: issue.path,
						message: issue.message,
					})),
				});
			}

			// Handle JWT errors
			if (
				error.name === 'UnauthorizedError' ||
				error.name === 'JsonWebTokenError'
			) {
				return reply.code(401).send({
					message: 'Unauthorized',
				});
			}

			// Handle database errors
			if (error.name === 'PostgresError') {
				const dbError = error as { code?: string; message: string };

				// Handle specific database errors
				if (dbError.code === '23505') {
					// Unique constraint violation
					return reply.code(409).send({
						message: 'Resource already exists',
					});
				}

				if (dbError.code === '23503') {
					// Foreign key constraint violation
					return reply.code(400).send({
						message: 'Invalid reference',
					});
				}

				// Log database errors but don't expose details
				request.log.error(dbError, 'Database error');
				return reply.code(500).send({
					message: 'Internal server error',
				});
			}

			// Default: Internal server error
			// In production, don't expose error details
			const isDevelopment = process.env.NODE_ENV === 'development';
			return reply.code(500).send({
				message: 'Internal server error',
				...(isDevelopment && { error: error.message, stack: error.stack }),
			});
		}
	);
}
