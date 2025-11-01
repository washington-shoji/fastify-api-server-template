import { randomBytes } from 'crypto';

/**
 * Token generation utilities
 */

/**
 * Generate a secure random token for CSRF protection
 * @param length - Token length in bytes (default: 32)
 * @returns Base64-encoded token
 */
export function generateCSRFToken(length = 32): string {
	return randomBytes(length).toString('base64url');
}

/**
 * Generate a secure random API key
 * @param length - Token length in bytes (default: 32)
 * @returns Base64-encoded token with prefix
 */
export function generateAPIKey(length = 32): string {
	const token = randomBytes(length).toString('base64url');
	return `fk_${token}`; // Prefix: fk = Fastify Key
}
