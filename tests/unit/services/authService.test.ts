import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createAuthService } from '../../../src/services/authService.js';
import { NotFoundError, UnauthorizedError } from '../../../src/utils/errors.js';
import type { User } from '../../../src/domain/user/user.schema.js';
import { uuidv7 } from 'uuidv7';

describe('AuthService', () => {
	let mockApp: FastifyInstance & {
		signAccessToken: Mock;
		signRefreshToken: Mock;
		verifyRefreshToken: Mock;
	};
	let mockDeps: {
		getUserById: Mock;
	};
	let authService: ReturnType<typeof createAuthService>;
	let testUserId: string;
	let testUser: User;

	beforeEach(() => {
		testUserId = uuidv7();
		testUser = {
			id: testUserId,
			user_name: 'testuser',
			email: 'test@example.com',
			password: 'hashedpassword',
		};

		mockDeps = {
			getUserById: vi.fn(),
		};

		// Mock FastifyInstance with JWT methods
		mockApp = {
			signAccessToken: vi.fn(),
			signRefreshToken: vi.fn(),
			verifyRefreshToken: vi.fn(),
		} as unknown as FastifyInstance & {
			signAccessToken: Mock;
			signRefreshToken: Mock;
			verifyRefreshToken: Mock;
		};

		authService = createAuthService(
			mockApp,
			mockDeps as { getUserById: (userId: string) => Promise<User | null> }
		);
	});

	describe('issueTokens', () => {
		it('should issue tokens for valid user', async () => {
			const mockAccessToken = 'access-token-123';
			const mockRefreshToken = 'refresh-token-456';

			mockDeps.getUserById.mockResolvedValue(testUser);
			mockApp.signAccessToken.mockResolvedValue(mockAccessToken);
			mockApp.signRefreshToken.mockResolvedValue(mockRefreshToken);

			const result = await authService.issueTokens(testUserId);

			expect(mockDeps.getUserById).toHaveBeenCalledWith(testUserId);
			expect(mockApp.signAccessToken).toHaveBeenCalledWith({
				sub: testUser.id,
				email: testUser.email,
			});
			expect(mockApp.signRefreshToken).toHaveBeenCalledWith({
				sub: testUser.id,
				email: testUser.email,
			});
			expect(result).toEqual({
				accessToken: mockAccessToken,
				refreshToken: mockRefreshToken,
				user: testUser,
			});
		});

		it('should throw NotFoundError if user does not exist', async () => {
			mockDeps.getUserById.mockResolvedValue(null);

			await expect(authService.issueTokens(testUserId)).rejects.toThrow(
				NotFoundError
			);
			await expect(authService.issueTokens(testUserId)).rejects.toThrow(
				'User not found'
			);

			expect(mockDeps.getUserById).toHaveBeenCalledWith(testUserId);
			expect(mockApp.signAccessToken).not.toHaveBeenCalled();
			expect(mockApp.signRefreshToken).not.toHaveBeenCalled();
		});
	});

	describe('refreshTokens', () => {
		it('should refresh tokens with valid refresh token', async () => {
			const mockRefreshToken = 'refresh-token-456';
			const mockNewAccessToken = 'new-access-token-123';
			const mockNewRefreshToken = 'new-refresh-token-789';
			const mockPayload = {
				sub: testUserId,
				email: testUser.email,
			};

			mockApp.verifyRefreshToken.mockResolvedValue(mockPayload);
			mockDeps.getUserById.mockResolvedValue(testUser);
			mockApp.signAccessToken.mockResolvedValue(mockNewAccessToken);
			mockApp.signRefreshToken.mockResolvedValue(mockNewRefreshToken);

			const result = await authService.refreshTokens(mockRefreshToken);

			expect(mockApp.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
			expect(mockDeps.getUserById).toHaveBeenCalledWith(testUserId);
			expect(mockApp.signAccessToken).toHaveBeenCalledWith({
				sub: testUser.id,
				email: testUser.email,
			});
			expect(mockApp.signRefreshToken).toHaveBeenCalledWith({
				sub: testUser.id,
				email: testUser.email,
			});
			expect(result).toEqual({
				accessToken: mockNewAccessToken,
				refreshToken: mockNewRefreshToken,
				user: testUser,
			});
		});

		it('should throw NotFoundError if user does not exist after token verification', async () => {
			const mockRefreshToken = 'refresh-token-456';
			const mockPayload = {
				sub: testUserId,
				email: testUser.email,
			};

			mockApp.verifyRefreshToken.mockResolvedValue(mockPayload);
			mockDeps.getUserById.mockResolvedValue(null);

			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				NotFoundError
			);
			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				'User not found'
			);

			expect(mockApp.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
			expect(mockDeps.getUserById).toHaveBeenCalledWith(testUserId);
			expect(mockApp.signAccessToken).not.toHaveBeenCalled();
			expect(mockApp.signRefreshToken).not.toHaveBeenCalled();
		});

		it('should throw UnauthorizedError if refresh token is invalid', async () => {
			const mockRefreshToken = 'invalid-refresh-token';
			const mockError = new Error('Invalid token');

			(
				mockApp.verifyRefreshToken as ReturnType<typeof vi.fn>
			).mockRejectedValue(mockError);

			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				UnauthorizedError
			);
			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				'Invalid refresh token'
			);

			expect(mockApp.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
			expect(mockDeps.getUserById).not.toHaveBeenCalled();
			expect(mockApp.signAccessToken).not.toHaveBeenCalled();
			expect(mockApp.signRefreshToken).not.toHaveBeenCalled();
		});

		it('should throw UnauthorizedError if refresh token verification fails', async () => {
			const mockRefreshToken = 'expired-refresh-token';
			const mockError = new Error('Token expired');

			(
				mockApp.verifyRefreshToken as ReturnType<typeof vi.fn>
			).mockRejectedValue(mockError);

			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				UnauthorizedError
			);
			await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
				'Invalid refresh token'
			);

			expect(mockApp.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
		});
	});
});
