import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { env } from '../env.js';

/**
 * Rate limiting middleware to protect against brute force and DoS attacks
 */
export async function setupRateLimit(app: FastifyInstance) {
	await app.register(rateLimit, {
		global: true, // Apply rate limiting to all routes
		max: env.RATE_LIMIT_MAX ?? 100, // Maximum number of requests
		timeWindow: env.RATE_LIMIT_TIME_WINDOW ?? '1 minute', // Time window
		errorResponseBuilder: (request, context) => {
			return {
				message: 'Too many requests',
				retryAfter: Math.round(context.ttl / 1000), // seconds
			};
		},
		// Custom key generator - rate limit per IP address
		keyGenerator: request => {
			return (
				(request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
				request.ip ||
				request.socket.remoteAddress ||
				'unknown'
			);
		},
	});
}
