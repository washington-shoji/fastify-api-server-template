import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../env.js';
import { generateETag, isETagMatch } from '../utils/etag.js';

/**
 * ETag Middleware
 * Automatically adds ETag headers to GET responses and handles 304 Not Modified
 *
 * This middleware:
 * - Generates ETags for GET responses based on response content
 * - Checks If-None-Match header for cached responses
 * - Returns 304 Not Modified when content hasn't changed
 * - Reduces bandwidth and improves client-side caching
 */
export function setupETagMiddleware(app: FastifyInstance) {
	// Skip if ETag is disabled
	if (!env.ENABLE_ETAG) {
		return;
	}

	// Hook to add ETag after response is serialized (onSend hook receives serialized payload)
	app.addHook(
		'onSend',
		async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
			// Only add ETags to successful GET requests
			if (request.method !== 'GET' || reply.statusCode >= 300) {
				return payload;
			}

			// Skip ETag for non-string payloads (Buffer, stream, etc.)
			if (payload === null || payload === undefined) {
				return payload;
			}

			try {
				// At this point, Fastify has already serialized objects to JSON strings
				// So payload is either a string (JSON) or Buffer
				let content: string | Buffer;
				if (Buffer.isBuffer(payload)) {
					content = payload;
				} else if (typeof payload === 'string') {
					content = payload;
				} else {
					// Fallback: stringify object if not already serialized
					content = JSON.stringify(payload);
				}

				// Generate ETag from serialized content
				const etag = generateETag(content);

				// Check if client has cached version
				if (isETagMatch(request, etag)) {
					reply.code(304); // Not Modified
					// Return empty string to avoid sending body
					return '';
				}

				// Set ETag header for client caching
				reply.header('ETag', etag);
				reply.header('Cache-Control', 'no-cache'); // Require revalidation
			} catch (error) {
				// If ETag generation fails, log and continue without ETag
				request.log.debug(
					{ error },
					'Failed to generate ETag, continuing without it'
				);
			}

			return payload;
		}
	);
}

/**
 * Helper to manually set ETag in route handlers
 * Useful when you need more control over ETag generation
 */
export function setETagHeader(
	reply: FastifyReply,
	payload: string | Buffer | object
): string {
	const etag = generateETag(payload);
	reply.header('ETag', etag);
	reply.header('Cache-Control', 'no-cache'); // Require revalidation
	return etag;
}
