import type { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';
import { eq, and } from 'drizzle-orm';
import { users } from '../db/schema/users';
import type {
	User,
	CreateUser,
	UpdateUser,
} from '../domain/user/user.schema.js';

export function createUserRepository(app: FastifyInstance) {
	return {
		async create(data: CreateUser): Promise<User> {
			const id = uuidv7();
			const [result] = await app.db
				.insert(users)
				.values({
					id,
					userName: data.user_name,
					email: data.email,
					password: data.password,
				})
				.returning();

			return {
				id: result.id,
				user_name: result.userName,
				email: result.email,
				password: result.password,
			};
		},

		async getById(id: string): Promise<User | null> {
			const [result] = await app.db
				.select()
				.from(users)
				.where(eq(users.id, id))
				.limit(1);

			if (!result) return null;
			return {
				id: result.id,
				user_name: result.userName,
				email: result.email,
				password: result.password,
			};
		},

		async getByEmail(email: string): Promise<User | null> {
			const [result] = await app.db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (!result) return null;
			return {
				id: result.id,
				user_name: result.userName,
				email: result.email,
				password: result.password,
			};
		},

		async getByUserName(userName: string): Promise<User | null> {
			const [result] = await app.db
				.select()
				.from(users)
				.where(eq(users.userName, userName))
				.limit(1);

			if (!result) return null;
			return {
				id: result.id,
				user_name: result.userName,
				email: result.email,
				password: result.password,
			};
		},

		async update(id: string, data: UpdateUser): Promise<User | null> {
			const updateData: Partial<typeof users.$inferInsert> = {};
			if (data.user_name !== undefined) updateData.userName = data.user_name;
			if (data.email !== undefined) updateData.email = data.email;
			if (data.password !== undefined) updateData.password = data.password;
			updateData.updatedAt = new Date();

			const [result] = await app.db
				.update(users)
				.set(updateData)
				.where(eq(users.id, id))
				.returning();

			if (!result) return null;
			return {
				id: result.id,
				user_name: result.userName,
				email: result.email,
				password: result.password,
			};
		},

		async delete(id: string): Promise<boolean> {
			const result = await app.db
				.delete(users)
				.where(eq(users.id, id))
				.returning();
			return result.length > 0;
		},
	};
}
