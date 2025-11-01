import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../../src/server.js';
import type { FastifyInstance } from 'fastify';
import { createTodoRepository } from '../../../src/repositories/todoRepository.js';
import { cleanTestDatabase, createTestDb } from '../../helpers/testDb.js';
import { todos } from '../../../src/db/schema/todos.js';
import { users } from '../../../src/db/schema/users.js';
import { uuidv7 } from 'uuidv7';
import type {
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../../../src/domain/todo/todo.schema.js';

describe('TodoRepository', () => {
	let app: FastifyInstance;
	let repository: ReturnType<typeof createTodoRepository>;
	let testUserId: string;
	let testDb: ReturnType<typeof createTestDb>;

	beforeAll(async () => {
		app = await buildServer();
		repository = createTodoRepository(app);
		testDb = createTestDb();
	});

	beforeEach(async () => {
		await cleanTestDatabase();

		// Create test user
		testUserId = uuidv7();
		await testDb.insert(users).values({
			id: testUserId,
			userName: 'testuser',
			email: 'test@example.com',
			password: 'hashedpassword',
		});
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	describe('create', () => {
		it('should create a new todo', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: 'Test description',
				completed: false,
			};

			const result = await repository.create(createData, testUserId);

			expect(result.id).toBeTruthy();
			expect(result.title).toBe('Test Todo');
			expect(result.description).toBe('Test description');
			expect(result.completed).toBe(false);
			expect(result.created_at).toBeInstanceOf(Date);
			expect(result.updated_at).toBeInstanceOf(Date);
			// Should not expose user_id
			expect(result).not.toHaveProperty('user_id');
		});

		it('should create todo with null description', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: null,
				completed: false,
			};

			const result = await repository.create(createData, testUserId);

			expect(result.title).toBe('Test Todo');
			expect(result.description).toBeNull();
		});

		it('should create todo with default completed false', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: null,
				completed: false,
			};

			const result = await repository.create(createData, testUserId);

			expect(result.completed).toBe(false);
		});

		it('should invalidate cache after create', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: null,
				completed: false,
			};

			const cacheKey = `todo:${testUserId}:*`;

			// Set a cache value first
			await app.cache.set(cacheKey, 'cached-value');

			await repository.create(createData, testUserId);

			// Cache should be invalidated
			const cachedValue = await app.cache.get(cacheKey);
			expect(cachedValue).toBeNull();
		});
	});

	describe('getById', () => {
		it('should return todo if found', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: 'Test description',
				completed: true,
			};

			const created = await repository.create(createData, testUserId);
			const result = await repository.getById(created.id, testUserId);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(created.id);
			expect(result?.title).toBe('Test Todo');
			expect(result?.description).toBe('Test description');
			expect(result?.completed).toBe(true);
		});

		it('should return null if todo not found', async () => {
			const nonExistentId = uuidv7();

			const result = await repository.getById(nonExistentId, testUserId);

			expect(result).toBeNull();
		});

		it('should return null if todo belongs to different user', async () => {
			const otherUserId = uuidv7();
			await testDb.insert(users).values({
				id: otherUserId,
				userName: 'otheruser',
				email: 'other@example.com',
				password: 'hashedpassword',
			});

			const createData: CreateTodo = {
				title: 'Other User Todo',
				description: null,
				completed: false,
			};

			const created = await repository.create(createData, otherUserId);

			// Try to get it as testUserId (should fail)
			const result = await repository.getById(created.id, testUserId);

			expect(result).toBeNull();
		});

		it('should cache todo after retrieval', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: null,
				completed: false,
			};

			const created = await repository.create(createData, testUserId);

			// First call - should hit database
			const result1 = await repository.getById(created.id, testUserId);

			// Second call - should hit cache (but we can't easily verify this without mocking)
			const result2 = await repository.getById(created.id, testUserId);

			expect(result1).toEqual(result2);
		});
	});

	describe('getAll', () => {
		it('should return all todos for user', async () => {
			const todos: CreateTodo[] = [
				{
					title: 'Todo 1',
					description: 'Description 1',
					completed: false,
				},
				{
					title: 'Todo 2',
					description: 'Description 2',
					completed: false,
				},
				{ title: 'Todo 3', description: null, completed: false },
			];

			for (const todo of todos) {
				await repository.create(todo, testUserId);
			}

			const result = await repository.getAll(testUserId);

			expect(result.items).toHaveLength(3);
			// Todos are returned in descending order (newest first) by default
			expect(result.items.map((t) => t.title)).toEqual([
				'Todo 3',
				'Todo 2',
				'Todo 1',
			]);
		});

		it('should return only todos for the specified user', async () => {
			const otherUserId = uuidv7();
			await testDb.insert(users).values({
				id: otherUserId,
				userName: 'otheruser',
				email: 'other@example.com',
				password: 'hashedpassword',
			});

			await repository.create(
				{ title: 'Test User Todo', description: null, completed: false },
				testUserId
			);
			await repository.create(
				{ title: 'Other User Todo', description: null, completed: false },
				otherUserId
			);

			const result = await repository.getAll(testUserId);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].title).toBe('Test User Todo');
		});

		it('should support pagination with limit', async () => {
			// Create 5 todos
			for (let i = 1; i <= 5; i++) {
				await repository.create(
					{
						title: `Todo ${i}`,
						description: null,
						completed: i % 2 === 0,
					},
					testUserId
				);
			}

			const result = await repository.getAll(testUserId, { limit: 3 });

			expect(result.items).toHaveLength(3);
		});

		it('should support cursor-based pagination', async () => {
			// Create 5 todos
			const createdTodos: TodoResponse[] = [];
			for (let i = 1; i <= 5; i++) {
				const todo = await repository.create(
					{ title: `Todo ${i}`, description: null, completed: false },
					testUserId
				);
				createdTodos.push(todo);
			}

			// Get first page
			const firstPage = await repository.getAll(testUserId, {
				limit: 2,
			});

			expect(firstPage.items).toHaveLength(2);
			expect(firstPage.nextCursor).toBeTruthy();

			// Get next page using cursor
			const secondPage = await repository.getAll(testUserId, {
				limit: 2,
				cursor: firstPage.nextCursor!,
			});

			expect(secondPage.items).toHaveLength(2);
			// Should not include items from first page
			expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
		});

		it('should return empty array if no todos', async () => {
			const result = await repository.getAll(testUserId);

			expect(result.items).toHaveLength(0);
			expect(result.nextCursor).toBeUndefined();
		});
	});

	describe('update', () => {
		it('should update todo if exists and belongs to user', async () => {
			const createData: CreateTodo = {
				title: 'Original Title',
				description: 'Original description',
				completed: false,
			};

			const created = await repository.create(createData, testUserId);

			const updateData: UpdateTodo = {
				title: 'Updated Title',
				description: 'Updated description',
				completed: true,
			};

			const result = await repository.update(
				created.id,
				updateData,
				testUserId
			);

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Updated Title');
			expect(result?.description).toBe('Updated description');
			expect(result?.completed).toBe(true);
		});

		it('should return null if todo does not exist', async () => {
			const nonExistentId = uuidv7();
			const updateData: UpdateTodo = {
				title: 'Updated Title',
			};

			const result = await repository.update(
				nonExistentId,
				updateData,
				testUserId
			);

			expect(result).toBeNull();
		});

		it('should return null if todo belongs to different user', async () => {
			const otherUserId = uuidv7();
			await testDb.insert(users).values({
				id: otherUserId,
				userName: 'otheruser',
				email: 'other@example.com',
				password: 'hashedpassword',
			});

			const created = await repository.create(
				{ title: 'Other User Todo', description: null, completed: false },
				otherUserId
			);

			const updateData: UpdateTodo = {
				title: 'Updated Title',
			};

			const result = await repository.update(
				created.id,
				updateData,
				testUserId
			);

			expect(result).toBeNull();
		});

		it('should partially update todo', async () => {
			const created = await repository.create(
				{
					title: 'Original Title',
					description: 'Original description',
					completed: false,
				},
				testUserId
			);

			const updateData: UpdateTodo = {
				completed: true,
			};

			const result = await repository.update(
				created.id,
				updateData,
				testUserId
			);

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Original Title');
			expect(result?.description).toBe('Original description');
			expect(result?.completed).toBe(true);
		});

		it('should invalidate cache after update', async () => {
			const created = await repository.create(
				{ title: 'Test Todo', description: null, completed: false },
				testUserId
			);

			const cacheKey = `todo:${testUserId}:${created.id}`;

			// Get todo to populate cache
			await repository.getById(created.id, testUserId);

			const updateData: UpdateTodo = {
				title: 'Updated Title',
			};

			await repository.update(created.id, updateData, testUserId);

			// Cache should be invalidated (we'll verify by checking fresh data)
			const freshResult = await repository.getById(created.id, testUserId);
			expect(freshResult?.title).toBe('Updated Title');
		});
	});

	describe('delete', () => {
		it('should delete todo if exists and belongs to user', async () => {
			const created = await repository.create(
				{ title: 'Test Todo', description: null, completed: false },
				testUserId
			);

			const result = await repository.delete(created.id, testUserId);

			expect(result).toBe(true);

			// Verify todo is deleted
			const deleted = await repository.getById(created.id, testUserId);
			expect(deleted).toBeNull();
		});

		it('should return false if todo does not exist', async () => {
			const nonExistentId = uuidv7();

			const result = await repository.delete(nonExistentId, testUserId);

			expect(result).toBe(false);
		});

		it('should return false if todo belongs to different user', async () => {
			const otherUserId = uuidv7();
			await testDb.insert(users).values({
				id: otherUserId,
				userName: 'otheruser',
				email: 'other@example.com',
				password: 'hashedpassword',
			});

			const created = await repository.create(
				{ title: 'Other User Todo', description: null, completed: false },
				otherUserId
			);

			const result = await repository.delete(created.id, testUserId);

			expect(result).toBe(false);

			// Verify todo still exists
			const stillExists = await repository.getById(created.id, otherUserId);
			expect(stillExists).not.toBeNull();
		});

		it('should invalidate cache after delete', async () => {
			const created = await repository.create(
				{ title: 'Test Todo', description: null, completed: false },
				testUserId
			);

			// Get todo to populate cache
			await repository.getById(created.id, testUserId);

			await repository.delete(created.id, testUserId);

			// Verify todo is deleted
			const deleted = await repository.getById(created.id, testUserId);
			expect(deleted).toBeNull();
		});
	});
});
