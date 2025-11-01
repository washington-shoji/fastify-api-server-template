import type { FastifyInstance } from 'fastify';
import type { User } from '../domain/user/user.schema.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';

export function createAuthService(
	app: FastifyInstance,
	deps: {
		getUserById: (userId: string) => Promise<User | null>;
	}
) {
	return {
		async issueTokens(userId: string) {
			// Business logic: Verify user exists before issuing tokens
			const user = await deps.getUserById(userId);
			if (!user) {
				throw new NotFoundError('User not found');
			}

			// Business logic: Could add user status checks here (e.g., is user active, banned, etc.)
			// if (user.status === 'banned') {
			//   throw new ForbiddenError('User account is banned');
			// }

			const payload = { sub: user.id, email: user.email };
			const accessToken = await app.signAccessToken(payload);
			const refreshToken = await app.signRefreshToken(payload);
			return { accessToken, refreshToken, user };
		},

		async refreshTokens(refreshToken: string) {
			try {
				const payload = (await app.verifyRefreshToken(refreshToken)) as any;
				const user = await deps.getUserById(String(payload.sub));
				if (!user) {
					throw new NotFoundError('User not found');
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
			} catch (error) {
				if (error instanceof NotFoundError) {
					throw error;
				}
				throw new UnauthorizedError('Invalid refresh token');
			}
		},
	};
}
