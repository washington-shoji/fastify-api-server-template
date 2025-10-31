import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
	'template_api_users',
	{
		id: uuid('id').primaryKey(),
		userName: varchar('user_name', { length: 255 }).notNull().unique(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		password: varchar('password', { length: 255 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		emailIdx: index('idx_template_api_users_email').on(table.email),
		userNameIdx: index('idx_template_api_users_user_name').on(table.userName),
		createdAtIdx: index('idx_template_api_users_created_at').on(
			table.createdAt
		),
	})
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
