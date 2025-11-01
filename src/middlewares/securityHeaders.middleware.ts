import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../env.js';

/**
 * Security headers middleware
 * Sets important security headers to protect against common attacks
 * Similar to Helmet.js but lightweight and Fastify-native
 */
export function setupSecurityHeaders(app: FastifyInstance) {
	app.addHook(
		'onRequest',
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Content Security Policy - prevents XSS attacks
			const cspDirectives = [
				"default-src 'self'",
				"script-src 'self'",
				"style-src 'self' 'unsafe-inline'",
				"img-src 'self' data: https:",
				"font-src 'self'",
				"connect-src 'self'",
				"frame-ancestors 'self'",
				"base-uri 'self'",
				"form-action 'self'",
			].join('; ');

			// X-Content-Type-Options - prevents MIME type sniffing
			reply.header('X-Content-Type-Options', 'nosniff');

			// X-Frame-Options - prevents clickjacking
			reply.header('X-Frame-Options', 'DENY');

			// X-XSS-Protection - legacy XSS protection for older browsers
			reply.header('X-XSS-Protection', '1; mode=block');

			// Referrer-Policy - controls referrer information
			reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

			// Permissions-Policy - restricts browser features
			reply.header(
				'Permissions-Policy',
				'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
			);

			// Content-Security-Policy - XSS protection
			// Allow unsafe-inline for Swagger UI in development
			if (env.NODE_ENV === 'production') {
				reply.header('Content-Security-Policy', cspDirectives);
			} else {
				// More permissive CSP for development (Swagger UI needs inline scripts/styles)
				const devCspDirectives = [
					"default-src 'self'",
					"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
					"style-src 'self' 'unsafe-inline'",
					"img-src 'self' data: https:",
					"font-src 'self'",
					"connect-src 'self'",
					"frame-ancestors 'self'",
					"base-uri 'self'",
					"form-action 'self'",
				].join('; ');
				reply.header('Content-Security-Policy', devCspDirectives);
			}

			// Strict-Transport-Security (HSTS) - force HTTPS in production
			if (env.NODE_ENV === 'production') {
				reply.header(
					'Strict-Transport-Security',
					'max-age=31536000; includeSubDomains; preload'
				);
			}

			// Remove X-Powered-By header (if Fastify sets it)
			reply.removeHeader('X-Powered-By');
		}
	);
}
