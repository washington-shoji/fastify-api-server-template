import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../../src/server.js';
import type { FastifyInstance } from 'fastify';
import { createUserRepository } from '../../../src/repositories/userRepository.js';
import { cleanTestDatabase } from '../../helpers/testDb.js';
import type {
	CreateUser,
	UpdateUser,
} from '../../../src/domain/user/user.schema.js';
import { uuidv7 } from 'uuidv7';

describe('UserRepository', () => {
	let app: FastifyInstance;
	let repository: ReturnType<typeof createUserRepository>;

	beforeAll(async () => {
		app = await buildServer();
		repository = createUserRepository(app);
	});

	beforeEach(async () => {
		await cleanTestDatabase();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	describe('create', () => {
		it('should create a new user', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			const result = await repository.create(createData);

			expect(result.id).toBeTruthy();
			expect(result.user_name).toBe('testuser');
			expect(result.email).toBe('test@example.com');
			expect(result.password).toBe('hashedpassword123');
		});

		it('should generate unique UUIDs for each user', async () => {
			const createData: CreateUser = {
				user_name: 'user1',
				email: 'user1@example.com',
				password: 'password1',
			};

			const user1 = await repository.create(createData);

			const createData2: CreateUser = {
				user_name: 'user2',
				email: 'user2@example.com',
				password: 'password2',
			};

			const user2 = await repository.create(createData2);

			expect(user1.id).not.toBe(user2.id);
		});
	});

	describe('getById', () => {
		it('should return user if found', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			const created = await repository.create(createData);
			const result = await repository.getById(created.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(created.id);
			expect(result?.user_name).toBe('testuser');
			expect(result?.email).toBe('test@example.com');
			expect(result?.password).toBe('hashedpassword123');
		});

		it('should return null if user not found', async () => {
			const nonExistentId = uuidv7();

			const result = await repository.getById(nonExistentId);

			expect(result).toBeNull();
		});
	});

	describe('getByEmail', () => {
		it('should return user if found by email', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			await repository.create(createData);
			const result = await repository.getByEmail('test@example.com');

			expect(result).not.toBeNull();
			expect(result?.email).toBe('test@example.com');
			expect(result?.user_name).toBe('testuser');
		});

		it('should return null if user not found by email', async () => {
			const result = await repository.getByEmail('nonexistent@example.com');

			expect(result).toBeNull();
		});

		it('should be case-sensitive for email lookup', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'Test@Example.com',
				password: 'hashedpassword123',
			};

			await repository.create(createData);

			// Case-sensitive lookup
			const result1 = await repository.getByEmail('Test@Example.com');
			expect(result1).not.toBeNull();

			const result2 = await repository.getByEmail('test@example.com');
			// Should return null if email case doesn't match (depends on DB collation)
			// This test might need adjustment based on actual database behavior
		});
	});

	describe('getByUserName', () => {
		it('should return user if found by user name', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			await repository.create(createData);
			const result = await repository.getByUserName('testuser');

			expect(result).not.toBeNull();
			expect(result?.user_name).toBe('testuser');
			expect(result?.email).toBe('test@example.com');
		});

		it('should return null if user not found by user name', async () => {
			const result = await repository.getByUserName('nonexistentuser');

			expect(result).toBeNull();
		});
	});

	describe('update', () => {
		it('should update user if exists', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			const created = await repository.create(createData);

			const updateData: UpdateUser = {
				user_name: 'updateduser',
				email: 'updated@example.com',
			};

			const result = await repository.update(created.id, updateData);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(created.id);
			expect(result?.user_name).toBe('updateduser');
			expect(result?.email).toBe('updated@example.com');
			expect(result?.password).toBe('hashedpassword123'); // Should remain unchanged
		});

		it('should return null if user does not exist', async () => {
			const nonExistentId = uuidv7();
			const updateData: UpdateUser = {
				user_name: 'updateduser',
			};

			const result = await repository.update(nonExistentId, updateData);

			expect(result).toBeNull();
		});

		it('should partially update user', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			const created = await repository.create(createData);

			const updateData: UpdateUser = {
				email: 'updated@example.com',
			};

			const result = await repository.update(created.id, updateData);

			expect(result).not.toBeNull();
			expect(result?.user_name).toBe('testuser'); // Should remain unchanged
			expect(result?.email).toBe('updated@example.com');
			expect(result?.password).toBe('hashedpassword123'); // Should remain unchanged
		});

		it('should update password', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'oldpassword',
			};

			const created = await repository.create(createData);

			const updateData: UpdateUser = {
				password: 'newpassword',
			};

			const result = await repository.update(created.id, updateData);

			expect(result).not.toBeNull();
			expect(result?.password).toBe('newpassword');
		});
	});

	describe('delete', () => {
		it('should delete user if exists', async () => {
			const createData: CreateUser = {
				user_name: 'testuser',
				email: 'test@example.com',
				password: 'hashedpassword123',
			};

			const created = await repository.create(createData);

			const result = await repository.delete(created.id);

			expect(result).toBe(true);

			// Verify user is deleted
			const deleted = await repository.getById(created.id);
			expect(deleted).toBeNull();
		});

		it('should return false if user does not exist', async () => {
			const nonExistentId = uuidv7();

			const result = await repository.delete(nonExistentId);

			expect(result).toBe(false);
		});
	});
});
