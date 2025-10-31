/**
 * Custom error classes for consistent error handling across the application
 */

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;

	constructor(message: string, statusCode: number, isOperational = true) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = isOperational;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}

		this.name = this.constructor.name;
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Resource not found') {
		super(message, 404);
	}
}

export class ValidationError extends AppError {
	public readonly errors?: Array<{
		path: (string | number)[];
		message: string;
	}>;

	constructor(
		message = 'Validation failed',
		errors?: Array<{ path: (string | number)[]; message: string }>
	) {
		super(message, 400);
		this.errors = errors;
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(message, 401);
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden') {
		super(message, 403);
	}
}

export class ConflictError extends AppError {
	constructor(message = 'Conflict') {
		super(message, 409);
	}
}

export class InternalServerError extends AppError {
	constructor(message = 'Internal server error') {
		super(message, 500);
	}
}
