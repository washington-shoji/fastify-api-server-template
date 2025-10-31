import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import type {
	User,
	CreateUser,
	UpdateUser,
} from '../domain/user/user.schema.js';

export function createUserRepository(app: FastifyInstance) {
	return {
		async create(data: CreateUser): Promise<User> {
			const id = uuidv7();
			const result = await app.db.query<User>(
				`INSERT INTO template_api_users (id, user_name, email, password, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, NOW(), NOW())
				 RETURNING id, user_name, email, password`,
				[id, data.user_name, data.email, data.password]
			);
			return result.rows[0];
		},

		async getById(id: string): Promise<User | null> {
			const result = await app.db.query<User>(
				`SELECT id, user_name, email, password
				 FROM template_api_users
				 WHERE id = $1`,
				[id]
			);
			if (result.rows.length === 0) return null;
			return result.rows[0];
		},

		async getByEmail(email: string): Promise<User | null> {
			const result = await app.db.query<User>(
				`SELECT id, user_name, email, password
				 FROM template_api_users
				 WHERE email = $1`,
				[email]
			);
			if (result.rows.length === 0) return null;
			return result.rows[0];
		},

		async getByUserName(userName: string): Promise<User | null> {
			const result = await app.db.query<User>(
				`SELECT id, user_name, email, password
				 FROM template_api_users
				 WHERE user_name = $1`,
				[userName]
			);
			if (result.rows.length === 0) return null;
			return result.rows[0];
		},

		async update(id: string, data: UpdateUser): Promise<User | null> {
			const updates: string[] = [];
			const values: unknown[] = [];
			let paramCount = 1;

			if (data.user_name !== undefined) {
				updates.push(`user_name = $${paramCount++}`);
				values.push(data.user_name);
			}
			if (data.email !== undefined) {
				updates.push(`email = $${paramCount++}`);
				values.push(data.email);
			}
			if (data.password !== undefined) {
				updates.push(`password = $${paramCount++}`);
				values.push(data.password);
			}

			if (updates.length === 0) {
				return this.getById(id);
			}

			updates.push(`updated_at = NOW()`);
			values.push(id);

			const result = await app.db.query<User>(
				`UPDATE template_api_users
				 SET ${updates.join(', ')}
				 WHERE id = $${paramCount}
				 RETURNING id, user_name, email, password`,
				values
			);

			if (result.rows.length === 0) return null;
			return result.rows[0];
		},

		async delete(id: string): Promise<boolean> {
			const result = await app.db.query(
				`DELETE FROM template_api_users WHERE id = $1`,
				[id]
			);
			return (result.rowCount ?? 0) > 0;
		},
	};
}
