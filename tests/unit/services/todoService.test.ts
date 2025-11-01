import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTodoService } from '../../../src/services/todoService.js';
import { ValidationError } from '../../../src/utils/errors.js';
import type {
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../../../src/domain/todo/todo.schema.js';
import type {
	PaginationParams,
	PaginatedResult,
} from '../../../src/utils/pagination.js';
import { uuidv7 } from 'uuidv7';

describe('TodoService', () => {
	let mockDeps: {
		createTodo: ReturnType<typeof vi.fn>;
		getTodoById: ReturnType<typeof vi.fn>;
		getAllTodos: ReturnType<typeof vi.fn>;
		updateTodo: ReturnType<typeof vi.fn>;
		deleteTodo: ReturnType<typeof vi.fn>;
	};
	let todoService: ReturnType<typeof createTodoService>;
	let testUserId: string;

	beforeEach(() => {
		testUserId = uuidv7();

		mockDeps = {
			createTodo: vi.fn(),
			getTodoById: vi.fn(),
			getAllTodos: vi.fn(),
			updateTodo: vi.fn(),
			deleteTodo: vi.fn(),
		};

		todoService = createTodoService(mockDeps);
	});

	describe('createTodo', () => {
		it('should create todo with valid data', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: 'Test description',
				completed: false,
			};

			const expectedResponse: TodoResponse = {
				id: uuidv7(),
				title: 'Test Todo',
				description: 'Test description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockDeps.createTodo.mockResolvedValue(expectedResponse);

			const result = await todoService.createTodo(createData, testUserId);

			expect(mockDeps.createTodo).toHaveBeenCalledWith(createData, testUserId);
			expect(result).toEqual(expectedResponse);
		});

		it('should throw ValidationError if title is empty', async () => {
			const createData: CreateTodo = {
				title: '   ',
				description: 'Test description',
			};

			await expect(
				todoService.createTodo(createData, testUserId)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.createTodo(createData, testUserId)
			).rejects.toThrow('Title cannot be empty');

			expect(mockDeps.createTodo).not.toHaveBeenCalled();
		});

		it('should throw ValidationError if description exceeds max length', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: 'x'.repeat(10001), // 10001 characters
			};

			await expect(
				todoService.createTodo(createData, testUserId)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.createTodo(createData, testUserId)
			).rejects.toThrow('Description exceeds maximum length');

			expect(mockDeps.createTodo).not.toHaveBeenCalled();
		});

		it('should allow description up to 10000 characters', async () => {
			const createData: CreateTodo = {
				title: 'Test Todo',
				description: 'x'.repeat(10000), // Exactly 10000 characters
			};

			const expectedResponse: TodoResponse = {
				id: uuidv7(),
				title: 'Test Todo',
				description: 'x'.repeat(10000),
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockDeps.createTodo.mockResolvedValue(expectedResponse);

			const result = await todoService.createTodo(createData, testUserId);

			expect(mockDeps.createTodo).toHaveBeenCalledWith(createData, testUserId);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe('getTodoById', () => {
		it('should return todo if found', async () => {
			const todoId = uuidv7();
			const expectedResponse: TodoResponse = {
				id: todoId,
				title: 'Test Todo',
				description: 'Test description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockDeps.getTodoById.mockResolvedValue(expectedResponse);

			const result = await todoService.getTodoById(todoId, testUserId);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(result).toEqual(expectedResponse);
		});

		it('should return null if todo not found', async () => {
			const todoId = uuidv7();

			mockDeps.getTodoById.mockResolvedValue(null);

			const result = await todoService.getTodoById(todoId, testUserId);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(result).toBeNull();
		});

		it('should throw ValidationError if id format is invalid', async () => {
			const invalidId = 'not-a-uuid';

			await expect(
				todoService.getTodoById(invalidId, testUserId)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.getTodoById(invalidId, testUserId)
			).rejects.toThrow('Invalid todo ID format');

			expect(mockDeps.getTodoById).not.toHaveBeenCalled();
		});
	});

	describe('getAllTodos', () => {
		it('should return todos with pagination', async () => {
			const pagination: PaginationParams = {
				cursor: uuidv7(),
				limit: 10,
			};

			const expectedResult: PaginatedResult<TodoResponse> = {
				items: [
					{
						id: uuidv7(),
						title: 'Todo 1',
						description: 'Description 1',
						completed: false,
						created_at: new Date(),
						updated_at: new Date(),
					},
				],
				nextCursor: uuidv7(),
			};

			mockDeps.getAllTodos.mockResolvedValue(expectedResult);

			const result = await todoService.getAllTodos(testUserId, pagination);

			expect(mockDeps.getAllTodos).toHaveBeenCalledWith(testUserId, pagination);
			expect(result).toEqual(expectedResult);
		});

		it('should throw ValidationError if limit is less than 1', async () => {
			const pagination: PaginationParams = {
				limit: 0,
			};

			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow('Pagination limit must be between 1 and 100');

			expect(mockDeps.getAllTodos).not.toHaveBeenCalled();
		});

		it('should throw ValidationError if limit exceeds 100', async () => {
			const pagination: PaginationParams = {
				limit: 101,
			};

			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow('Pagination limit must be between 1 and 100');

			expect(mockDeps.getAllTodos).not.toHaveBeenCalled();
		});

		it('should throw ValidationError if cursor format is invalid', async () => {
			const pagination: PaginationParams = {
				cursor: 'not-a-uuid',
				limit: 10,
			};

			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.getAllTodos(testUserId, pagination)
			).rejects.toThrow('Invalid pagination cursor format');

			expect(mockDeps.getAllTodos).not.toHaveBeenCalled();
		});

		it('should allow limit between 1 and 100', async () => {
			const pagination: PaginationParams = {
				limit: 50,
			};

			const expectedResult: PaginatedResult<TodoResponse> = {
				items: [],
				nextCursor: undefined,
			};

			mockDeps.getAllTodos.mockResolvedValue(expectedResult);

			const result = await todoService.getAllTodos(testUserId, pagination);

			expect(mockDeps.getAllTodos).toHaveBeenCalledWith(testUserId, pagination);
			expect(result).toEqual(expectedResult);
		});

		it('should work without pagination', async () => {
			const expectedResult: PaginatedResult<TodoResponse> = {
				items: [],
				nextCursor: undefined,
			};

			mockDeps.getAllTodos.mockResolvedValue(expectedResult);

			const result = await todoService.getAllTodos(testUserId);

			expect(mockDeps.getAllTodos).toHaveBeenCalledWith(testUserId, undefined);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('updateTodo', () => {
		it('should update todo if exists and belongs to user', async () => {
			const todoId = uuidv7();
			const existingTodo: TodoResponse = {
				id: todoId,
				title: 'Original Title',
				description: 'Original description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			const updateData: UpdateTodo = {
				title: 'Updated Title',
				completed: true,
			};

			const updatedTodo: TodoResponse = {
				...existingTodo,
				title: 'Updated Title',
				completed: true,
				updated_at: new Date(),
			};

			mockDeps.getTodoById.mockResolvedValue(existingTodo);
			mockDeps.updateTodo.mockResolvedValue(updatedTodo);

			const result = await todoService.updateTodo(
				todoId,
				updateData,
				testUserId
			);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(mockDeps.updateTodo).toHaveBeenCalledWith(
				todoId,
				updateData,
				testUserId
			);
			expect(result).toEqual(updatedTodo);
		});

		it('should return null if todo does not exist', async () => {
			const todoId = uuidv7();
			const updateData: UpdateTodo = {
				title: 'Updated Title',
			};

			mockDeps.getTodoById.mockResolvedValue(null);

			const result = await todoService.updateTodo(
				todoId,
				updateData,
				testUserId
			);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(mockDeps.updateTodo).not.toHaveBeenCalled();
			expect(result).toBeNull();
		});

		it('should throw ValidationError if updated title is empty', async () => {
			const todoId = uuidv7();
			const existingTodo: TodoResponse = {
				id: todoId,
				title: 'Original Title',
				description: 'Original description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			const updateData: UpdateTodo = {
				title: '   ',
			};

			mockDeps.getTodoById.mockResolvedValue(existingTodo);

			await expect(
				todoService.updateTodo(todoId, updateData, testUserId)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.updateTodo(todoId, updateData, testUserId)
			).rejects.toThrow('Title cannot be empty');

			expect(mockDeps.updateTodo).not.toHaveBeenCalled();
		});

		it('should throw ValidationError if updated description exceeds max length', async () => {
			const todoId = uuidv7();
			const existingTodo: TodoResponse = {
				id: todoId,
				title: 'Original Title',
				description: 'Original description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			const updateData: UpdateTodo = {
				description: 'x'.repeat(10001),
			};

			mockDeps.getTodoById.mockResolvedValue(existingTodo);

			await expect(
				todoService.updateTodo(todoId, updateData, testUserId)
			).rejects.toThrow(ValidationError);
			await expect(
				todoService.updateTodo(todoId, updateData, testUserId)
			).rejects.toThrow('Description exceeds maximum length');

			expect(mockDeps.updateTodo).not.toHaveBeenCalled();
		});

		it('should allow null description', async () => {
			const todoId = uuidv7();
			const existingTodo: TodoResponse = {
				id: todoId,
				title: 'Original Title',
				description: 'Original description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			const updateData: UpdateTodo = {
				description: null,
			};

			const updatedTodo: TodoResponse = {
				...existingTodo,
				description: null,
				updated_at: new Date(),
			};

			mockDeps.getTodoById.mockResolvedValue(existingTodo);
			mockDeps.updateTodo.mockResolvedValue(updatedTodo);

			const result = await todoService.updateTodo(
				todoId,
				updateData,
				testUserId
			);

			expect(mockDeps.updateTodo).toHaveBeenCalledWith(
				todoId,
				updateData,
				testUserId
			);
			expect(result).toEqual(updatedTodo);
		});
	});

	describe('deleteTodo', () => {
		it('should delete todo if exists and belongs to user', async () => {
			const todoId = uuidv7();
			const existingTodo: TodoResponse = {
				id: todoId,
				title: 'Test Todo',
				description: 'Test description',
				completed: false,
				created_at: new Date(),
				updated_at: new Date(),
			};

			mockDeps.getTodoById.mockResolvedValue(existingTodo);
			mockDeps.deleteTodo.mockResolvedValue(true);

			const result = await todoService.deleteTodo(todoId, testUserId);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(mockDeps.deleteTodo).toHaveBeenCalledWith(todoId, testUserId);
			expect(result).toBe(true);
		});

		it('should return false if todo does not exist', async () => {
			const todoId = uuidv7();

			mockDeps.getTodoById.mockResolvedValue(null);

			const result = await todoService.deleteTodo(todoId, testUserId);

			expect(mockDeps.getTodoById).toHaveBeenCalledWith(todoId, testUserId);
			expect(mockDeps.deleteTodo).not.toHaveBeenCalled();
			expect(result).toBe(false);
		});
	});
});
