import { createHash } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * ETag utility for HTTP caching
 * Generates ETags for responses to enable conditional requests and reduce bandwidth
 */

/**
 * Generate ETag from response payload
 * @param payload - Response payload (string, Buffer, or object)
 * @param weak - Whether to use weak ETag (default: false, use strong ETag)
 * @returns ETag string (e.g., "abc123" or W/"abc123")
 */
export function generateETag(
	payload: string | Buffer | object,
	weak = false
): string {
	let content: string;

	if (typeof payload === 'string') {
		content = payload;
	} else if (Buffer.isBuffer(payload)) {
		content = payload.toString('utf-8');
	} else {
		// JSON.stringify with sorted keys for consistent hashing
		content = JSON.stringify(payload, Object.keys(payload).sort());
	}

	const hash = createHash('md5').update(content).digest('hex');
	return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Check if request has matching ETag (304 Not Modified)
 * @param request - Fastify request
 * @param etag - Current ETag
 * @returns True if ETag matches (client has cached version)
 */
export function isETagMatch(request: FastifyRequest, etag: string): boolean {
	const ifNoneMatch = request.headers['if-none-match'] as string | undefined;
	if (!ifNoneMatch) {
		return false;
	}

	// Remove quotes and W/ prefix for comparison
	const normalizedETag = etag.replace(/^W\//, '').replace(/"/g, '');
	const normalizedIfNoneMatch = ifNoneMatch
		.replace(/^W\//, '')
		.replace(/"/g, '');

	return normalizedIfNoneMatch === normalizedETag;
}

/**
 * Set ETag header and check for 304 Not Modified
 * @param reply - Fastify reply
 * @param etag - ETag value
 * @returns True if should return 304 (not modified), false otherwise
 */
export function handleETag(reply: FastifyReply, etag: string): boolean {
	reply.header('ETag', etag);
	return false; // Let the caller handle 304 response
}

/**
 * Middleware helper to set ETag and return 304 if unchanged
 * Use this in route handlers after getting the data
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param payload - Response payload
 * @param weak - Use weak ETag (default: false)
 * @returns True if 304 was sent, false otherwise
 */
export function setETagAndCheck(
	request: FastifyRequest,
	reply: FastifyReply,
	payload: string | Buffer | object,
	weak = false
): boolean {
	const etag = generateETag(payload, weak);
	reply.header('ETag', etag);

	// Check if client has cached version
	if (isETagMatch(request, etag)) {
		reply.code(304);
		reply.send();
		return true; // 304 sent, don't send body
	}

	return false; // Continue with normal response
}
