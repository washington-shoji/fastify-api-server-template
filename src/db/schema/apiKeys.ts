import {
	pgTable,
	uuid,
	varchar,
	timestamp,
	boolean,
	index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * API Keys table
 * Stores API keys for programmatic access
 */
export const apiKeys = pgTable(
	'template_api_api_keys',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		keyHash: varchar('key_hash', { length: 255 }).notNull(), // Hashed API key
		name: varchar('name', { length: 255 }).notNull(), // Human-readable name
		description: varchar('description', { length: 500 }), // Optional description
		lastUsedAt: timestamp('last_used_at', { withTimezone: true }), // Track last usage
		expiresAt: timestamp('expires_at', { withTimezone: true }), // Optional expiration
		isActive: boolean('is_active').notNull().default(true), // Can be deactivated
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	table => ({
		userIdIdx: index('idx_template_api_api_keys_user_id').on(table.userId),
		keyHashIdx: index('idx_template_api_api_keys_key_hash').on(table.keyHash),
		isActiveIdx: index('idx_template_api_api_keys_is_active').on(
			table.isActive
		),
	})
);
