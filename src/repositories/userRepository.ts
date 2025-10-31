import type { FastifyInstance } from 'fastify';

export type User = { id: string; email: string | null };

export function createUserRepository(app: FastifyInstance) {
	return {
		async getById(userId: string, email?: string | null): Promise<User> {
			// No schema dependencies: return literals via a simple query.
			const result = await app.db.query<{ id: string; email: string | null }>(
				'SELECT $1::text as id, $2::text as email',
				[userId, email ?? null]
			);
			return result.rows[0];
		},
	};
}
