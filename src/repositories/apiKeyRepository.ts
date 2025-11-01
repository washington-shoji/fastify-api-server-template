import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import { eq, and } from 'drizzle-orm';
import { apiKeys } from '../db/schema/apiKeys.js';
import { hashPassword } from '../utils/password.js';

export interface CreateAPIKey {
	userId: string;
	name: string;
	description?: string;
	expiresAt?: Date;
}

export interface APIKey {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	lastUsedAt: Date | null;
	expiresAt: Date | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface APIKeyWithHash extends APIKey {
	keyHash: string; // Only included when creating, never returned in responses
}

/**
 * Create API key repository
 */
export function createAPIKeyRepository(app: FastifyInstance) {
	return {
		/**
		 * Create a new API key
		 * Returns the plain API key (only shown once) and the API key record
		 */
		async create(
			data: CreateAPIKey,
			plainAPIKey: string
		): Promise<{ apiKey: string; record: APIKey }> {
			const id = uuidv7();
			const keyHash = await hashPassword(plainAPIKey);

			const [result] = await app.db
				.insert(apiKeys)
				.values({
					id,
					userId: data.userId,
					keyHash,
					name: data.name,
					description: data.description || null,
					expiresAt: data.expiresAt || null,
					isActive: true,
				})
				.returning();

			return {
				apiKey: plainAPIKey, // Return plain key only once
				record: {
					id: result.id,
					userId: result.userId,
					name: result.name,
					description: result.description,
					lastUsedAt: result.lastUsedAt,
					expiresAt: result.expiresAt,
					isActive: result.isActive,
					createdAt: result.createdAt,
					updatedAt: result.updatedAt,
				},
			};
		},

		/**
		 * Find API key by hash (for validation)
		 * Note: This is for exact hash matches. For bcrypt comparison, use validateAPIKey
		 */
		async findByHash(keyHash: string): Promise<APIKeyWithHash | null> {
			const [result] = await app.db
				.select()
				.from(apiKeys)
				.where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
				.limit(1);

			if (!result) return null;

			// Check expiration
			if (result.expiresAt && result.expiresAt < new Date()) {
				return null; // Expired
			}

			return {
				id: result.id,
				userId: result.userId,
				keyHash: result.keyHash,
				name: result.name,
				description: result.description,
				lastUsedAt: result.lastUsedAt,
				expiresAt: result.expiresAt,
				isActive: result.isActive,
				createdAt: result.createdAt,
				updatedAt: result.updatedAt,
			};
		},

		/**
		 * Find all active API keys for validation
		 * Used to compare plain API key against hashed keys
		 * Note: This returns all active keys. For production, consider using a lookup table.
		 */
		async findAllActive(): Promise<APIKeyWithHash[]> {
			const results = await app.db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.isActive, true));

			return results
				.filter(result => {
					// Check expiration
					if (result.expiresAt && result.expiresAt < new Date()) {
						return false; // Expired
					}
					return true;
				})
				.map(result => ({
					id: result.id,
					userId: result.userId,
					keyHash: result.keyHash,
					name: result.name,
					description: result.description,
					lastUsedAt: result.lastUsedAt,
					expiresAt: result.expiresAt,
					isActive: result.isActive,
					createdAt: result.createdAt,
					updatedAt: result.updatedAt,
				}));
		},

		/**
		 * Find all active API keys for a user (for management)
		 */
		async findAllActiveForUser(userId: string): Promise<APIKeyWithHash[]> {
			const results = await app.db
				.select()
				.from(apiKeys)
				.where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));

			return results
				.filter(result => {
					// Check expiration
					if (result.expiresAt && result.expiresAt < new Date()) {
						return false; // Expired
					}
					return true;
				})
				.map(result => ({
					id: result.id,
					userId: result.userId,
					keyHash: result.keyHash,
					name: result.name,
					description: result.description,
					lastUsedAt: result.lastUsedAt,
					expiresAt: result.expiresAt,
					isActive: result.isActive,
					createdAt: result.createdAt,
					updatedAt: result.updatedAt,
				}));
		},

		/**
		 * Get all API keys for a user (without hashes)
		 */
		async getByUserId(userId: string): Promise<APIKey[]> {
			const results = await app.db
				.select({
					id: apiKeys.id,
					userId: apiKeys.userId,
					name: apiKeys.name,
					description: apiKeys.description,
					lastUsedAt: apiKeys.lastUsedAt,
					expiresAt: apiKeys.expiresAt,
					isActive: apiKeys.isActive,
					createdAt: apiKeys.createdAt,
					updatedAt: apiKeys.updatedAt,
				})
				.from(apiKeys)
				.where(eq(apiKeys.userId, userId));

			return results.map(row => ({
				id: row.id,
				userId: row.userId,
				name: row.name,
				description: row.description,
				lastUsedAt: row.lastUsedAt,
				expiresAt: row.expiresAt,
				isActive: row.isActive,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			}));
		},

		/**
		 * Get API key by ID (for a specific user)
		 */
		async getById(id: string, userId: string): Promise<APIKey | null> {
			const [result] = await app.db
				.select({
					id: apiKeys.id,
					userId: apiKeys.userId,
					name: apiKeys.name,
					description: apiKeys.description,
					lastUsedAt: apiKeys.lastUsedAt,
					expiresAt: apiKeys.expiresAt,
					isActive: apiKeys.isActive,
					createdAt: apiKeys.createdAt,
					updatedAt: apiKeys.updatedAt,
				})
				.from(apiKeys)
				.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
				.limit(1);

			if (!result) return null;

			return {
				id: result.id,
				userId: result.userId,
				name: result.name,
				description: result.description,
				lastUsedAt: result.lastUsedAt,
				expiresAt: result.expiresAt,
				isActive: result.isActive,
				createdAt: result.createdAt,
				updatedAt: result.updatedAt,
			};
		},

		/**
		 * Update last used timestamp
		 */
		async updateLastUsed(id: string): Promise<void> {
			await app.db
				.update(apiKeys)
				.set({
					lastUsedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(apiKeys.id, id));
		},

		/**
		 * Deactivate API key
		 */
		async deactivate(id: string, userId: string): Promise<boolean> {
			const [result] = await app.db
				.update(apiKeys)
				.set({
					isActive: false,
					updatedAt: new Date(),
				})
				.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
				.returning();

			return !!result;
		},

		/**
		 * Delete API key
		 */
		async delete(id: string, userId: string): Promise<boolean> {
			const result = await app.db
				.delete(apiKeys)
				.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
				.returning();

			return result.length > 0;
		},
	};
}
