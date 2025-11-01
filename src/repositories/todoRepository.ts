import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import { eq, and, desc, lt } from 'drizzle-orm';
import { todos } from '../db/schema/todos';
import type {
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../domain/todo/todo.schema.js';
import type { PaginationParams, PaginatedResult } from '../utils/pagination.js';

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

			const todoResponse: TodoResponse = {
				id: result.id,
				title: result.title,
				description: result.description,
				completed: result.completed,
				created_at: result.createdAt,
				updated_at: result.updatedAt,
			};

			// Invalidate user's todo list cache after create
			await app.cache.delPattern(`todo:${userId}:*`);

			// Return without user_id (security: never expose to client)
			return todoResponse;
		},

		async getById(id: string, userId: string): Promise<TodoResponse | null> {
			// Cache key includes userId for security (scoped per user)
			const cacheKey = `todo:${userId}:${id}`;

			// Try to get from cache first, then fallback to database
			// Cache for 1 hour (3600 seconds) or use default TTL from env
			return app.cache.getOrSet(
				cacheKey,
				async () => {
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
				3600 // TTL: 1 hour
			);
		},

		async getAll(
			userId: string,
			pagination?: PaginationParams
		): Promise<PaginatedResult<TodoResponse>> {
			const limit = pagination?.limit ?? 20;

			// Build query with cursor-based pagination
			// Since we use UUIDv7 (time-ordered), we can use lexicographic comparison
			// For UUIDv7, newer items have lexicographically greater IDs
			const conditions = pagination?.cursor
				? and(eq(todos.userId, userId), lt(todos.id, pagination.cursor))
				: eq(todos.userId, userId);

			// Fetch one extra item to determine if there are more
			const result = await app.db
				.select()
				.from(todos)
				.where(conditions)
				.orderBy(desc(todos.createdAt))
				.limit(limit + 1);

			const hasMore = result.length > limit;
			const items = hasMore ? result.slice(0, limit) : result;
			const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

			// Return without user_id (security: never expose to client)
			const mappedItems: TodoResponse[] = items.map(row => ({
				id: row.id,
				title: row.title,
				description: row.description,
				completed: row.completed,
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			}));

			return {
				items: mappedItems,
				nextCursor,
				hasMore,
				count: mappedItems.length,
			};
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

			const todoResponse: TodoResponse = {
				id: result.id,
				title: result.title,
				description: result.description,
				completed: result.completed,
				created_at: result.createdAt,
				updated_at: result.updatedAt,
			};

			// Invalidate cache for this specific todo and user's todo list
			await app.cache.del(`todo:${userId}:${id}`);
			await app.cache.delPattern(`todo:${userId}:*`);

			// Return without user_id (security: never expose to client)
			return todoResponse;
		},

		async delete(id: string, userId: string): Promise<boolean> {
			const result = await app.db
				.delete(todos)
				.where(and(eq(todos.id, id), eq(todos.userId, userId)))
				.returning();

			if (result.length > 0) {
				// Invalidate cache for this specific todo and user's todo list
				await app.cache.del(`todo:${userId}:${id}`);
				await app.cache.delPattern(`todo:${userId}:*`);
			}

			return result.length > 0;
		},
	};
}
