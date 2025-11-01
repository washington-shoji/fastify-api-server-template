/**
 * Auth DTOs (Data Transfer Objects)
 * DTOs represent the API contract for authentication endpoints
 */

export interface IssueTokenDTO {
	userId: string;
	email?: string;
}

export interface RefreshTokenDTO {
	refreshToken?: string;
}

export interface TokenResponseDTO {
	accessToken: string;
	refreshToken: string;
}

export interface UserInfoDTO {
	sub: string;
	email?: string | null;
	iat?: number;
	exp?: number;
}

/**
 * Transform JWT payload to UserInfoDTO
 */
export function toUserInfoDTO(payload: {
	sub?: string;
	email?: string;
	iat?: number;
	exp?: number;
	[key: string]: unknown;
}): UserInfoDTO {
	return {
		sub: payload.sub || '',
		email: payload.email || null,
		iat: payload.iat,
		exp: payload.exp,
	};
}

/**
 * Transform IssueTokenDTO to domain format
 */
export function fromIssueTokenDTO(dto: IssueTokenDTO): {
	userId: string;
	email?: string;
} {
	return {
		userId: dto.userId,
		email: dto.email,
	};
}
