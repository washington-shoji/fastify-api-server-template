import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Audit logging utility
 * Logs security-relevant events for compliance and security monitoring
 */

export enum AuditEventType {
	LOGIN_SUCCESS = 'login_success',
	LOGIN_FAILURE = 'login_failure',
	LOGOUT = 'logout',
	REGISTER = 'register',
	TOKEN_REFRESH = 'token_refresh',
	TOKEN_ISSUE = 'token_issue',
	PASSWORD_CHANGE = 'password_change',
	ACCOUNT_LOCKED = 'account_locked',
	UNAUTHORIZED_ACCESS = 'unauthorized_access',
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	DATA_ACCESS = 'data_access',
	DATA_MODIFICATION = 'data_modification',
	DATA_DELETION = 'data_deletion',
	API_KEY_USED = 'api_key_used',
	CSRF_VIOLATION = 'csrf_violation',
}

export interface AuditLogEntry {
	timestamp: Date;
	eventType: AuditEventType;
	userId?: string;
	ipAddress?: string;
	userAgent?: string;
	requestId?: string;
	resource?: string;
	action?: string;
	status: 'success' | 'failure';
	details?: Record<string, unknown>;
	error?: string;
}

/**
 * Log audit event
 */
export function logAuditEvent(
	app: FastifyInstance,
	entry: AuditLogEntry
): void {
	const logEntry = {
		audit: true,
		timestamp: entry.timestamp.toISOString(),
		eventType: entry.eventType,
		userId: entry.userId || null,
		ipAddress: entry.ipAddress || null,
		userAgent: entry.userAgent || null,
		requestId: entry.requestId || null,
		resource: entry.resource || null,
		action: entry.action || null,
		status: entry.status,
		details: entry.details || {},
		error: entry.error || null,
	};

	// Log as structured JSON for easy parsing by log aggregators
	app.log.info(logEntry, `[AUDIT] ${entry.eventType}`);
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: FastifyRequest): string {
	return (
		(request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
		(request.headers['x-real-ip'] as string) ||
		request.socket.remoteAddress ||
		'unknown'
	);
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: FastifyRequest): string {
	return (request.headers['user-agent'] as string) || 'unknown';
}

/**
 * Helper to create audit log entry from request
 */
export function createAuditEntry(
	request: FastifyRequest,
	eventType: AuditEventType,
	status: 'success' | 'failure',
	details?: Record<string, unknown>,
	error?: string
): AuditLogEntry {
	return {
		timestamp: new Date(),
		eventType,
		userId: (request as any).userId,
		ipAddress: getClientIp(request),
		userAgent: getUserAgent(request),
		requestId: (request as any).requestId,
		resource: request.url,
		action: request.method,
		status,
		details,
		error,
	};
}
