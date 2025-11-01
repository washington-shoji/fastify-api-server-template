import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';
import type { createAuthService } from '../services/authService.js';
import {
	toUserInfoDTO,
	fromIssueTokenDTO,
	fromRegisterDTO,
	fromLoginDTO,
	type TokenResponseDTO,
} from '../dto/auth.dto.js';
import { setCSRFToken } from '../middlewares/csrf.middleware.js';
import { generateCSRFToken } from '../utils/tokens.js';
import {
	logAuditEvent,
	AuditEventType,
	createAuditEntry,
} from '../utils/auditLogger.js';

export function createAuthController(
	app: FastifyInstance,
	authService: ReturnType<typeof createAuthService>
) {
	// Helper function to set auth cookies
	const setAuthCookies = (
		reply: FastifyReply,
		accessToken: string,
		refreshToken: string,
		request?: FastifyRequest
	) => {
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

		// Generate and set CSRF token for Double Submit Cookie pattern
		const csrfToken = generateCSRFToken();
		setCSRFToken(reply, csrfToken);
	};

	// Helper function to clear auth cookies
	const clearAuthCookies = (reply: FastifyReply) => {
		const commonCookie = {
			httpOnly: true,
			sameSite: 'lax' as const,
			secure: env.COOKIE_SECURE === 'true',
			domain: env.COOKIE_DOMAIN,
			path: '/',
		};

		reply
			.clearCookie('access_token', commonCookie)
			.clearCookie('refresh_token', commonCookie);
	};

	const registerSchema = z.object({
		user_name: z.string().min(1).max(255),
		email: z.string().email(),
		password: z.string().min(8),
	});

	const loginSchema = z.object({
		identifier: z.string().min(1),
		password: z.string().min(1),
	});

	const loginBodySchema = z.object({
		userId: z.string().min(1),
		email: z.string().email().optional(),
	});

	async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
		const parsed = registerSchema.safeParse(request.body);
		if (!parsed.success) {
			logAuditEvent(
				app,
				createAuditEntry(
					request,
					AuditEventType.REGISTER,
					'failure',
					{ reason: 'Invalid request body' },
					'Validation failed'
				)
			);
			return reply.code(400).send({ message: 'Invalid body' });
		}

		try {
			// Transform DTO to domain format
			const data = fromRegisterDTO({
				user_name: parsed.data.user_name,
				email: parsed.data.email,
				password: parsed.data.password,
			});

			const { accessToken, refreshToken, user } = await authService.register(
				data
			);

			setAuthCookies(reply, accessToken, refreshToken, request);

			// Audit log successful registration
			logAuditEvent(
				app,
				createAuditEntry(request, AuditEventType.REGISTER, 'success', {
					userId: user.id,
					email: user.email,
				})
			);

			// Transform to response DTO
			const responseDTO: TokenResponseDTO = {
				accessToken,
				refreshToken,
			};

			return reply.code(201).send(responseDTO);
		} catch (error: any) {
			// Audit log failed registration
			logAuditEvent(
				app,
				createAuditEntry(
					request,
					AuditEventType.REGISTER,
					'failure',
					{
						email: parsed.data.email,
						user_name: parsed.data.user_name,
					},
					error.message
				)
			);
			throw error;
		}
	}

	async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
		const parsed = loginSchema.safeParse(request.body);
		if (!parsed.success) {
			logAuditEvent(
				app,
				createAuditEntry(
					request,
					AuditEventType.LOGIN_FAILURE,
					'failure',
					{ reason: 'Invalid request body' },
					'Validation failed'
				)
			);
			return reply.code(400).send({ message: 'Invalid body' });
		}

		try {
			// Transform DTO to domain format
			const { identifier, password } = fromLoginDTO({
				identifier: parsed.data.identifier,
				password: parsed.data.password,
			});

			const { accessToken, refreshToken, user } = await authService.login(
				identifier,
				password
			);

			setAuthCookies(reply, accessToken, refreshToken, request);

			// Audit log successful login
			logAuditEvent(
				app,
				createAuditEntry(request, AuditEventType.LOGIN_SUCCESS, 'success', {
					userId: user.id,
					identifier,
				})
			);

			// Transform to response DTO
			const responseDTO: TokenResponseDTO = {
				accessToken,
				refreshToken,
			};

			return responseDTO;
		} catch (error: any) {
			// Audit log failed login
			logAuditEvent(
				app,
				createAuditEntry(
					request,
					AuditEventType.LOGIN_FAILURE,
					'failure',
					{ identifier: parsed.data.identifier },
					error.message
				)
			);
			throw error;
		}
	}

	async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
		// Audit log logout
		if ((request as any).userId) {
			logAuditEvent(
				app,
				createAuditEntry(request, AuditEventType.LOGOUT, 'success', {
					userId: (request as any).userId,
				})
			);
		}

		// Clear CSRF token cookie
		reply.clearCookie('csrf_token', {
			httpOnly: false,
			sameSite: 'strict',
			secure: env.COOKIE_SECURE === 'true',
			path: '/',
		});

		clearAuthCookies(reply);
		return reply.code(200).send({ message: 'Logged out successfully' });
	}

	async function issueTokenHandler(
		request: FastifyRequest,
		reply: FastifyReply
	) {
		const parsed = loginBodySchema.safeParse(request.body);
		if (!parsed.success)
			return reply.code(400).send({ message: 'Invalid body' });

		// Transform DTO to domain format
		const { userId } = fromIssueTokenDTO({
			userId: parsed.data.userId,
			email: parsed.data.email,
		});

		const { accessToken, refreshToken } = await authService.issueTokens(userId);

		setAuthCookies(reply, accessToken, refreshToken, request);

		// Audit log token issuance
		logAuditEvent(
			app,
			createAuditEntry(request, AuditEventType.TOKEN_ISSUE, 'success', {
				userId,
			})
		);

		// Transform to response DTO
		const responseDTO: TokenResponseDTO = {
			accessToken,
			refreshToken,
		};

		return responseDTO;
	}

	async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
		const tokenFromCookie = request.cookies?.refresh_token as
			| string
			| undefined;
		const tokenFromBody = (request.body as any)?.refreshToken as
			| string
			| undefined;
		const token = tokenFromBody || tokenFromCookie;
		if (!token) {
			return reply.code(401).send({ message: 'Missing refresh token' });
		}

		const { accessToken, refreshToken, user } = await authService.refreshTokens(
			token
		);

		setAuthCookies(reply, accessToken, refreshToken, request);

		// Audit log token refresh
		logAuditEvent(
			app,
			createAuditEntry(request, AuditEventType.TOKEN_REFRESH, 'success', {
				userId: user.id,
			})
		);

		// Transform to response DTO
		const responseDTO: TokenResponseDTO = {
			accessToken,
			refreshToken,
		};

		return responseDTO;
	}

	async function meHandler(request: FastifyRequest) {
		// Transform JWT payload to response DTO
		// Type assertion: request.user is guaranteed to be set by JWT authentication
		const userDTO = toUserInfoDTO(
			request.user as {
				sub?: string;
				email?: string;
				iat?: number;
				exp?: number;
				[key: string]: unknown;
			}
		);
		return { user: userDTO };
	}

	return {
		registerHandler,
		loginHandler,
		logoutHandler,
		issueTokenHandler,
		refreshHandler,
		meHandler,
	};
}
