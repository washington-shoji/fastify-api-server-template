import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';
import type { createAuthService } from '../services/authService.js';

export function createAuthController(
	app: FastifyInstance,
	authService: ReturnType<typeof createAuthService>
) {
	const loginBodySchema = z.object({
		userId: z.string().min(1),
		email: z.string().email().optional(),
	});

	async function issueTokenHandler(
		request: FastifyRequest,
		reply: FastifyReply
	) {
		const parsed = loginBodySchema.safeParse(request.body);
		if (!parsed.success)
			return reply.code(400).send({ message: 'Invalid body' });

		const { accessToken, refreshToken } = await authService.issueTokens(
			parsed.data.userId
		);

		const commonCookie = {
			httpOnly: true,
			sameSite: 'lax' as const,
			secure: env.COOKIE_SECURE === 'true',
			domain: env.COOKIE_DOMAIN,
			path: '/',
		};

		reply
			.setCookie('access_token', accessToken, {
				...commonCookie,
				maxAge: 60 * 60,
			})
			.setCookie('refresh_token', refreshToken, {
				...commonCookie,
				maxAge: 7 * 24 * 60 * 60,
			});

		return { accessToken, refreshToken };
	}

	async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
		const tokenFromCookie = request.cookies?.refresh_token as
			| string
			| undefined;
		const tokenFromBody = (request.body as any)?.refreshToken as
			| string
			| undefined;
		const token = tokenFromBody || tokenFromCookie;
		if (!token)
			return reply.code(401).send({ message: 'Missing refresh token' });

		try {
			const { accessToken, refreshToken } = await authService.refreshTokens(
				token
			);

			const commonCookie = {
				httpOnly: true,
				sameSite: 'lax' as const,
				secure: env.COOKIE_SECURE === 'true',
				domain: env.COOKIE_DOMAIN,
				path: '/',
			};

			reply
				.setCookie('access_token', accessToken, {
					...commonCookie,
					maxAge: 60 * 60,
				})
				.setCookie('refresh_token', refreshToken, {
					...commonCookie,
					maxAge: 7 * 24 * 60 * 60,
				});

			return { accessToken, refreshToken };
		} catch {
			return reply.code(401).send({ message: 'Invalid refresh token' });
		}
	}

	async function meHandler(request: FastifyRequest) {
		return { user: request.user };
	}

	return { issueTokenHandler, refreshHandler, meHandler };
}
