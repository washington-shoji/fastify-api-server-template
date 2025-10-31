import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import * as jsonwebtoken from 'jsonwebtoken';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../env.js';
import { UnauthorizedError } from '../utils/errors.js';

async function jwtPlugin(app: FastifyInstance) {
	// Register JWT plugin for access tokens
	await app.register(jwt, {
		secret: env.JWT_ACCESS_SECRET,
		cookie: {
			cookieName: 'access_token',
			signed: false,
		},
	});

	// Create a separate JWT instance for refresh tokens
	// We need to manually sign/verify refresh tokens with different secret
	app.decorate(
		'authenticate',
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify();
			} catch (err) {
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
		} catch (err) {
			throw new UnauthorizedError('Invalid refresh token');
		}
	});
}

export default fp(jwtPlugin, { name: 'jwt-plugin' });
