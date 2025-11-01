import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';
import {
	logAuditEvent,
	AuditEventType,
	createAuditEntry,
} from '../utils/auditLogger.js';
import { env } from '../env.js';

/**
 * CSRF Protection Middleware
 * Protects state-changing operations (POST, PUT, DELETE, PATCH) from Cross-Site Request Forgery attacks
 *
 * Strategy:
 * - Uses Double Submit Cookie pattern (simpler than CSRF tokens for stateless APIs)
 * - Requires CSRF token in both cookie and header for state-changing requests
 * - GET, HEAD, OPTIONS requests are excluded (safe methods)
 */
export function setupCSRFProtection(app: FastifyInstance) {
	// Skip if CSRF is disabled or in test mode
	if (!env.ENABLE_CSRF || process.env.NODE_ENV === 'test') {
		return;
	}

	// Safe HTTP methods that don't modify state
	const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

	app.addHook(
		'onRequest',
		async (request: FastifyRequest, _reply: FastifyReply) => {
			// Skip CSRF check for safe methods
			if (safeMethods.includes(request.method)) {
				return;
			}

			// Skip CSRF check for health endpoints and Swagger UI
			if (
				request.url.startsWith('/health') ||
				request.url.startsWith('/docs') ||
				request.url.startsWith('/internal')
			) {
				return;
			}

			// Get CSRF token from cookie
			const csrfTokenFromCookie = request.cookies?.csrf_token as
				| string
				| undefined;

			// Get CSRF token from header (standard header name)
			const csrfTokenFromHeader =
				(request.headers['x-csrf-token'] as string) ||
				(request.headers['csrf-token'] as string) ||
				(request.headers['x-xsrf-token'] as string);

			// Both token sources must be present and match
			if (!csrfTokenFromCookie || !csrfTokenFromHeader) {
				logAuditEvent(
					app,
					createAuditEntry(request, AuditEventType.CSRF_VIOLATION, 'failure', {
						reason: 'Missing CSRF token',
						hasCookie: !!csrfTokenFromCookie,
						hasHeader: !!csrfTokenFromHeader,
					})
				);
				throw new UnauthorizedError('CSRF token required');
			}

			// Tokens must match (constant-time comparison to prevent timing attacks)
			if (!constantTimeEquals(csrfTokenFromCookie, csrfTokenFromHeader)) {
				logAuditEvent(
					app,
					createAuditEntry(request, AuditEventType.CSRF_VIOLATION, 'failure', {
						reason: 'CSRF token mismatch',
					})
				);
				throw new UnauthorizedError('Invalid CSRF token');
			}
		}
	);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Generate and set CSRF token cookie
 * Call this after successful authentication to set the CSRF token
 */
export function setCSRFToken(reply: FastifyReply, token: string): void {
	const isProduction = process.env.NODE_ENV === 'production';

	reply.setCookie('csrf_token', token, {
		httpOnly: false, // Must be readable by JavaScript for Double Submit Cookie pattern
		sameSite: 'strict', // Prevent cross-site cookie sending
		secure: isProduction, // HTTPS only in production
		path: '/',
		maxAge: 60 * 60 * 24 * 7, // 7 days
	});
}
