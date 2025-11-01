import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';
import { comparePassword } from '../utils/password.js';
import {
	logAuditEvent,
	AuditEventType,
	createAuditEntry,
} from '../utils/auditLogger.js';
import type { createAPIKeyRepository } from '../repositories/apiKeyRepository.js';

/**
 * API Key Authentication Plugin
 * Provides API key authentication as an alternative to JWT tokens
 *
 * API keys are validated via:
 * - `X-API-Key` header
 * - `api_key` query parameter (less secure, for convenience)
 */

interface APIKeyPluginOptions {
	/**
	 * API key repository for validation
	 */
	apiKeyRepository: ReturnType<typeof createAPIKeyRepository>;
}

async function apiKeyPlugin(app: FastifyInstance, opts: APIKeyPluginOptions) {
	// Decorator for API key authentication
	app.decorate(
		'authenticateWithAPIKey',
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Get API key from header or query parameter
			const apiKeyFromHeader = (request.headers['x-api-key'] as string)?.trim();
			const apiKeyFromQuery = (request.query as any)?.api_key as
				| string
				| undefined;

			const apiKey = apiKeyFromHeader || apiKeyFromQuery;

			if (!apiKey) {
				logAuditEvent(
					app,
					createAuditEntry(
						request,
						AuditEventType.UNAUTHORIZED_ACCESS,
						'failure',
						{ reason: 'Missing API key' },
						'API key required'
					)
				);
				throw new UnauthorizedError('API key required');
			}

			// Validate API key by comparing against all active keys
			// Note: This approach requires comparing against all keys, which is not optimal
			// for large-scale systems. For production, consider:
			// 1. Using a lookup table with a key prefix/index
			// 2. Storing a partial key identifier for faster lookup
			// 3. Using a key-value store (Redis) for active key lookups
			const allActiveKeys = await opts.apiKeyRepository.findAllActive();

			let userId: string | null = null;
			let apiKeyId: string | null = null;

			// Try to find matching API key by comparing hash
			for (const key of allActiveKeys) {
				const isValid = await comparePassword(apiKey, key.keyHash);
				if (isValid) {
					userId = key.userId;
					apiKeyId = key.id;
					// Update last used timestamp
					await opts.apiKeyRepository.updateLastUsed(key.id);
					break;
				}
			}

			if (!userId || !apiKeyId) {
				logAuditEvent(
					app,
					createAuditEntry(
						request,
						AuditEventType.UNAUTHORIZED_ACCESS,
						'failure',
						{ reason: 'Invalid API key' },
						'Invalid API key'
					)
				);
				throw new UnauthorizedError('Invalid API key');
			}

			// Audit log successful API key usage
			logAuditEvent(
				app,
				createAuditEntry(request, AuditEventType.API_KEY_USED, 'success', {
					userId,
					apiKeyId,
				})
			);

			// Set user ID for use in handlers
			(request as any).userId = userId;

			// Create minimal user object for compatibility with JWT auth
			(request as any).user = {
				sub: userId,
			};
		}
	);
}

export default fp(apiKeyPlugin, {
	name: 'api-key-plugin',
});
