import type {
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../domain/todo/todo.schema.js';
import type { PaginationParams, PaginatedResult } from '../utils/pagination.js';
import { ValidationError } from '../utils/errors.js';

export function createTodoService(deps: {
	createTodo: (data: CreateTodo, userId: string) => Promise<TodoResponse>;
	getTodoById: (id: string, userId: string) => Promise<TodoResponse | null>;
	getAllTodos: (
		userId: string,
		pagination?: PaginationParams
	) => Promise<PaginatedResult<TodoResponse>>;
	updateTodo: (
		id: string,
		data: UpdateTodo,
		userId: string
	) => Promise<TodoResponse | null>;
	deleteTodo: (id: string, userId: string) => Promise<boolean>;
}) {
	return {
		async createTodo(data: CreateTodo, userId: string): Promise<TodoResponse> {
			// Business logic: Validate title length
			if (data.title.trim().length === 0) {
				throw new ValidationError('Title cannot be empty');
			}

			// Business logic: Limit description length
			if (data.description && data.description.length > 10000) {
				throw new ValidationError(
					'Description exceeds maximum length of 10000 characters'
				);
			}

			return deps.createTodo(data, userId);
		},

		async getTodoById(
			id: string,
			userId: string
		): Promise<TodoResponse | null> {
			// Business logic: Validate UUID format (already done at route level, but double-check)
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(id)) {
				throw new ValidationError('Invalid todo ID format');
			}

			return deps.getTodoById(id, userId);
		},

		async getAllTodos(
			userId: string,
			pagination?: PaginationParams
		): Promise<PaginatedResult<TodoResponse>> {
			// Business logic: Validate pagination parameters
			if (pagination) {
				if (
					pagination.limit &&
					(pagination.limit < 1 || pagination.limit > 100)
				) {
					throw new ValidationError(
						'Pagination limit must be between 1 and 100'
					);
				}

				if (pagination.cursor) {
					const uuidRegex =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
					if (!uuidRegex.test(pagination.cursor)) {
						throw new ValidationError('Invalid pagination cursor format');
					}
				}
			}

			return deps.getAllTodos(userId, pagination);
		},

		async updateTodo(
			id: string,
			data: UpdateTodo,
			userId: string
		): Promise<TodoResponse | null> {
			// Business logic: Validate todo exists and belongs to user
			const existing = await deps.getTodoById(id, userId);
			if (!existing) {
				return null;
			}

			// Business logic: Validate update data
			if (data.title !== undefined) {
				if (data.title.trim().length === 0) {
					throw new ValidationError('Title cannot be empty');
				}
			}

			if (data.description !== undefined && data.description !== null) {
				if (data.description.length > 10000) {
					throw new ValidationError(
						'Description exceeds maximum length of 10000 characters'
					);
				}
			}

			return deps.updateTodo(id, data, userId);
		},

		async deleteTodo(id: string, userId: string): Promise<boolean> {
			// Business logic: Validate todo exists and belongs to user before deletion
			const existing = await deps.getTodoById(id, userId);
			if (!existing) {
				return false;
			}

			return deps.deleteTodo(id, userId);
		},
	};
}
