import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import { eq, and, desc } from 'drizzle-orm';
import { todos } from '../db/schema/todos';
import type {
	Todo,
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../domain/todo/todo.schema.js';

export function createTodoRepository(app: FastifyInstance) {
	return {
		async create(data: CreateTodo, userId: string): Promise<TodoResponse> {
			const id = uuidv7();
			const [result] = await app.db
				.insert(todos)
				.values({
					id,
					userId,
					title: data.title,
					description: data.description ?? null,
					completed: data.completed ?? false,
				})
				.returning();

			// Return without user_id (security: never expose to client)
			return {
				id: result.id,
				title: result.title,
				description: result.description,
				completed: result.completed,
				created_at: result.createdAt,
				updated_at: result.updatedAt,
			};
		},

		async getById(id: string, userId: string): Promise<TodoResponse | null> {
			const [result] = await app.db
				.select()
				.from(todos)
				.where(and(eq(todos.id, id), eq(todos.userId, userId)))
				.limit(1);

			if (!result) return null;
			// Return without user_id (security: never expose to client)
			return {
				id: result.id,
				title: result.title,
				description: result.description,
				completed: result.completed,
				created_at: result.createdAt,
				updated_at: result.updatedAt,
			};
		},

		async getAll(userId: string): Promise<TodoResponse[]> {
			const result = await app.db
				.select()
				.from(todos)
				.where(eq(todos.userId, userId))
				.orderBy(desc(todos.createdAt));

			// Return without user_id (security: never expose to client)
			return result.map((row) => ({
				id: row.id,
				title: row.title,
				description: row.description,
				completed: row.completed,
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			}));
		},

		async update(
			id: string,
			data: UpdateTodo,
			userId: string
		): Promise<TodoResponse | null> {
			const updateData: Partial<typeof todos.$inferInsert> = {};
			if (data.title !== undefined) updateData.title = data.title;
			if (data.description !== undefined)
				updateData.description = data.description;
			if (data.completed !== undefined) updateData.completed = data.completed;
			updateData.updatedAt = new Date();

			const [result] = await app.db
				.update(todos)
				.set(updateData)
				.where(and(eq(todos.id, id), eq(todos.userId, userId)))
				.returning();

			if (!result) return null;
			// Return without user_id (security: never expose to client)
			return {
				id: result.id,
				title: result.title,
				description: result.description,
				completed: result.completed,
				created_at: result.createdAt,
				updated_at: result.updatedAt,
			};
		},

		async delete(id: string, userId: string): Promise<boolean> {
			const result = await app.db
				.delete(todos)
				.where(and(eq(todos.id, id), eq(todos.userId, userId)))
				.returning();
			return result.length > 0;
		},
	};
}
