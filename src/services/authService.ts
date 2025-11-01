import type { FastifyInstance } from 'fastify';
import type { User, CreateUser } from '../domain/user/user.schema.js';
import {
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from '../utils/errors.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export function createAuthService(
	app: FastifyInstance,
	deps: {
		getUserById: (userId: string) => Promise<User | null>;
		getUserByEmail: (email: string) => Promise<User | null>;
		getUserByUserName: (userName: string) => Promise<User | null>;
		createUser: (data: CreateUser) => Promise<User>;
	}
) {
	return {
		async register(data: {
			user_name: string;
			email: string;
			password: string;
		}) {
			// Business logic: Check if user already exists
			const existingUserByEmail = await deps.getUserByEmail(data.email);
			if (existingUserByEmail) {
				throw new ValidationError('Email already exists');
			}

			const existingUserByUserName = await deps.getUserByUserName(
				data.user_name
			);
			if (existingUserByUserName) {
				throw new ValidationError('Username already exists');
			}

			// Business logic: Hash password before storing
			const hashedPassword = await hashPassword(data.password);

			// Business logic: Create user
			const user = await deps.createUser({
				user_name: data.user_name,
				email: data.email,
				password: hashedPassword,
			});

			// Business logic: Issue tokens after registration
			const payload = { sub: user.id, email: user.email };
			const accessToken = await app.signAccessToken(payload);
			const refreshToken = await app.signRefreshToken(payload);

			return { accessToken, refreshToken, user };
		},

		async login(identifier: string, password: string) {
			// Business logic: Find user by email or username
			const user =
				(await deps.getUserByEmail(identifier)) ||
				(await deps.getUserByUserName(identifier));

			if (!user) {
				throw new UnauthorizedError('Invalid credentials');
			}

			// Business logic: Verify password
			const isPasswordValid = await comparePassword(password, user.password);
			if (!isPasswordValid) {
				throw new UnauthorizedError('Invalid credentials');
			}

			// Business logic: Issue tokens after successful login
			const payload = { sub: user.id, email: user.email };
			const accessToken = await app.signAccessToken(payload);
			const refreshToken = await app.signRefreshToken(payload);

			return { accessToken, refreshToken, user };
		},

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
