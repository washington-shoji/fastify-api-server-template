import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import type {
	Todo,
	CreateTodo,
	UpdateTodo,
} from '../domain/todo/todo.schema.js';

export function createTodoRepository(app: FastifyInstance) {
	return {
		async create(data: CreateTodo, userId: string): Promise<Todo> {
			const id = uuidv7();
			const result = await app.db.query<Todo>(
				`INSERT INTO template_api_todos (id, user_id, title, description, completed, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
				 RETURNING id, user_id, title, description, completed, created_at, updated_at`,
				[
					id,
					userId,
					data.title,
					data.description ?? null,
					data.completed ?? false,
				]
			);
			return {
				...result.rows[0],
				created_at: result.rows[0].created_at,
				updated_at: result.rows[0].updated_at,
			};
		},

		async getById(id: string, userId: string): Promise<Todo | null> {
			const result = await app.db.query<Todo>(
				`SELECT id, user_id, title, description, completed, created_at, updated_at
				 FROM template_api_todos
				 WHERE id = $1 AND user_id = $2`,
				[id, userId]
			);
			if (result.rows.length === 0) return null;
			return {
				...result.rows[0],
				created_at: result.rows[0].created_at,
				updated_at: result.rows[0].updated_at,
			};
		},

		async getAll(userId: string): Promise<Todo[]> {
			const result = await app.db.query<Todo>(
				`SELECT id, user_id, title, description, completed, created_at, updated_at
				 FROM template_api_todos
				 WHERE user_id = $1
				 ORDER BY created_at DESC`,
				[userId]
			);
			return result.rows.map((row) => ({
				...row,
				created_at: row.created_at,
				updated_at: row.updated_at,
			}));
		},

		async update(
			id: string,
			data: UpdateTodo,
			userId: string
		): Promise<Todo | null> {
			const updates: string[] = [];
			const values: unknown[] = [];
			let paramCount = 1;

			if (data.title !== undefined) {
				updates.push(`title = $${paramCount++}`);
				values.push(data.title);
			}
			if (data.description !== undefined) {
				updates.push(`description = $${paramCount++}`);
				values.push(data.description);
			}
			if (data.completed !== undefined) {
				updates.push(`completed = $${paramCount++}`);
				values.push(data.completed);
			}

			if (updates.length === 0) {
				return this.getById(id, userId);
			}

			updates.push(`updated_at = NOW()`);
			values.push(id, userId);

			const result = await app.db.query<Todo>(
				`UPDATE template_api_todos
				 SET ${updates.join(', ')}
				 WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
				 RETURNING id, user_id, title, description, completed, created_at, updated_at`,
				values
			);

			if (result.rows.length === 0) return null;
			return {
				...result.rows[0],
				created_at: result.rows[0].created_at,
				updated_at: result.rows[0].updated_at,
			};
		},

		async delete(id: string, userId: string): Promise<boolean> {
			const result = await app.db.query(
				`DELETE FROM template_api_todos WHERE id = $1 AND user_id = $2`,
				[id, userId]
			);
			return (result.rowCount ?? 0) > 0;
		},
	};
}
