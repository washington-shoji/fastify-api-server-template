import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import * as jsonwebtoken from 'jsonwebtoken';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../env.js';
import { UnauthorizedError } from '../utils/errors.js';

async function jwtPlugin(app: FastifyInstance) {
	// Register JWT plugin for access tokens
	// By default, @fastify/jwt reads from:
	// 1. Authorization header (Bearer token) - automatic
	// 2. Cookies - if configured
	await app.register(jwt, {
		secret: env.JWT_ACCESS_SECRET,
		cookie: {
			cookieName: 'access_token',
			signed: false,
		},
		// Explicitly configure to read from Authorization header (this is default, but being explicit)
		// The plugin automatically reads from Authorization: Bearer <token> by default
	});

	// Create a separate JWT instance for refresh tokens
	// We need to manually sign/verify refresh tokens with different secret
	app.decorate(
		'authenticate',
		async (request: FastifyRequest, _reply: FastifyReply) => {
			try {
				// jwtVerify automatically reads from Authorization: Bearer <token> header
				// or from cookies if configured
				await request.jwtVerify();
			} catch (err: any) {
				// Log the actual error for debugging in tests
				if (process.env.NODE_ENV !== 'production') {
					request.log.debug(
						{
							err,
							authHeader: request.headers.authorization,
							hasCookie: !!request.cookies?.access_token,
						},
						'JWT verification failed'
					);
				}
				throw new UnauthorizedError();
			}
		}
	);

	app.decorate('signAccessToken', async (payload: object) => {
		return app.jwt.sign(payload, { expiresIn: env.ACCESS_TOKEN_TTL });
	});

	app.decorate('signRefreshToken', async (payload: object) => {
		// Use jsonwebtoken directly with refresh secret for signing
		return jsonwebtoken.sign(payload, env.JWT_REFRESH_SECRET, {
			expiresIn: env.REFRESH_TOKEN_TTL,
		} as jsonwebtoken.SignOptions);
	});

	app.decorate('verifyRefreshToken', async (token: string) => {
		// Use jsonwebtoken directly with refresh secret for verification
		try {
			return jsonwebtoken.verify(token, env.JWT_REFRESH_SECRET);
		} catch {
			throw new UnauthorizedError('Invalid refresh token');
		}
	});
}

export default fp(jwtPlugin, { name: 'jwt-plugin' });
