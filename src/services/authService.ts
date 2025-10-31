import type { FastifyInstance } from 'fastify';
import type { User } from '../domain/user/user.schema.js';

export function createAuthService(
	app: FastifyInstance,
	deps: {
		getUserById: (userId: string, email?: string | null) => Promise<User>;
	}
) {
	return {
		async issueTokens(userId: string, email?: string | null) {
			const user = await deps.getUserById(userId, email ?? null);
			const payload = { sub: user.id, email: user.email ?? undefined };
			const accessToken = await app.signAccessToken(payload);
			const refreshToken = await app.signRefreshToken(payload);
			return { accessToken, refreshToken, user };
		},

		async refreshTokens(refreshToken: string) {
			const payload = (await app.verifyRefreshToken(refreshToken)) as any;
			const user = await deps.getUserById(
				String(payload.sub),
				payload.email ?? null
			);
			const newAccess = await app.signAccessToken({
				sub: user.id,
				email: user.email ?? undefined,
			});
			const newRefresh = await app.signRefreshToken({
				sub: user.id,
				email: user.email ?? undefined,
			});
			return { accessToken: newAccess, refreshToken: newRefresh, user };
		},
	};
}
