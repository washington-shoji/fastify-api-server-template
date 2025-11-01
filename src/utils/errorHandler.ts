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

			// Handle Fastify schema validation errors (runs before controller)
			// Fastify validation errors have a 'validation' property with array of errors
			// These errors occur during schema validation before the route handler runs
			// FastifyError also has statusCode 400 for validation errors
			if (
				(error as any).validation ||
				(error as any).validationContext ||
				((error as any).statusCode === 400 &&
					(error as any).code?.startsWith('FST'))
			) {
				const validationError = error as any;
				const validationErrors = Array.isArray(validationError.validation)
					? validationError.validation
					: validationError.validation
						? [validationError.validation]
						: [];

				return reply.code(400).send({
					message:
						validationError.message || error.message || 'Validation failed',
					...(validationErrors.length > 0 && {
						errors: validationErrors.map((v: any) => {
							const path = (
								v.instancePath ||
								v.params?.missingProperty ||
								v.dataPath ||
								v.path ||
								''
							).replace(/^\//, '');
							return {
								path: path ? path.split('/').filter(Boolean) : [],
								message:
									v.message || validationError.message || 'Validation error',
							};
						}),
					}),
				});
			}

			// Handle Zod validation errors
			if (error.name === 'ZodError' && 'issues' in error) {
				const zodError = error as {
					issues: Array<{ path: string[]; message: string }>;
				};
				return reply.code(400).send({
					message: 'Validation failed',
					errors: zodError.issues.map(issue => ({
						path: issue.path,
						message: issue.message,
					})),
				});
			}

			// Handle JWT errors
			if (
				error.name === 'UnauthorizedError' ||
				error.name === 'JsonWebTokenError' ||
				error.name === 'TokenExpiredError' ||
				error.name === 'NotBeforeError' ||
				error.message?.includes('jwt') ||
				error.message?.includes('token')
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
