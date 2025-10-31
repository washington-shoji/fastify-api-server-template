import type { FastifyInstance } from 'fastify';
import type { User } from '../domain/user/user.schema.js';

export function createAuthService(
	app: FastifyInstance,
	deps: {
		getUserById: (userId: string) => Promise<User | null>;
	}
) {
	return {
		async issueTokens(userId: string) {
			const user = await deps.getUserById(userId);
			if (!user) {
				throw new Error('User not found');
			}
			const payload = { sub: user.id, email: user.email };
			const accessToken = await app.signAccessToken(payload);
			const refreshToken = await app.signRefreshToken(payload);
			return { accessToken, refreshToken, user };
		},

		async refreshTokens(refreshToken: string) {
			const payload = (await app.verifyRefreshToken(refreshToken)) as any;
			const user = await deps.getUserById(String(payload.sub));
			if (!user) {
				throw new Error('User not found');
			}
			const newAccess = await app.signAccessToken({
				sub: user.id,
				email: user.email,
			});
			const newRefresh = await app.signRefreshToken({
				sub: user.id,
				email: user.email,
			});
			return { accessToken: newAccess, refreshToken: newRefresh, user };
		},
	};
}
