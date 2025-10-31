import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const todos = pgTable(
	'template_api_todos',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 255 }).notNull(),
		description: text('description'),
		completed: boolean('completed').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		createdAtIdx: index('idx_template_api_todos_created_at').on(
			table.createdAt
		),
		completedIdx: index('idx_template_api_todos_completed').on(table.completed),
		userIdIdx: index('idx_template_api_todos_user_id').on(table.userId),
	})
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
