import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
	CreateTodoSchema,
	UpdateTodoSchema,
} from '../domain/todo/todo.schema.js';
import type { createTodoService } from '../services/todoService.js';
import {
	ValidationError,
	NotFoundError,
	UnauthorizedError,
} from '../utils/errors.js';
import {
	toTodoResponseDTO,
	toTodoResponseDTOArray,
	fromCreateTodoDTO,
	fromUpdateTodoDTO,
	type CreateTodoDTO,
	type UpdateTodoDTO,
	type TodoListResponseDTO,
} from '../dto/todo.dto.js';

export function createTodoController(
	app: FastifyInstance,
	todoService: ReturnType<typeof createTodoService>
) {
	async function createHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		// Validate request body using Zod schema
		const parsed = CreateTodoSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new ValidationError('Invalid request body', parsed.error.errors);
		}

		// Transform DTO to domain model
		const createData = fromCreateTodoDTO(parsed.data as CreateTodoDTO);

		// Call service with domain model
		const todo = await todoService.createTodo(createData, userId);

		// Transform domain model to response DTO
		const responseDTO = toTodoResponseDTO(todo);
		return reply.code(201).send(responseDTO);
	}

	async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		const { id } = request.params as { id: string };
		const todo = await todoService.getTodoById(id, userId);

		if (!todo) {
			throw new NotFoundError('Todo not found');
		}

		// Transform domain model to response DTO
		const responseDTO = toTodoResponseDTO(todo);
		return reply.send(responseDTO);
	}

	async function getAllHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		const query = request.query as { cursor?: string; limit?: string };
		const paginationParams = {
			cursor: query.cursor,
			limit: query.limit
				? Math.min(Math.max(parseInt(query.limit, 10), 1), 100)
				: 20,
		};

		const result = await todoService.getAllTodos(userId, paginationParams);

		// Transform domain models to response DTOs
		const responseDTO: TodoListResponseDTO = {
			items: toTodoResponseDTOArray(result.items),
			nextCursor: result.nextCursor ?? null,
			hasMore: result.hasMore,
			count: result.count,
		};
		return reply.send(responseDTO);
	}

	async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		const { id } = request.params as { id: string };
		const parsed = UpdateTodoSchema.safeParse(request.body);

		if (!parsed.success) {
			throw new ValidationError('Invalid request body', parsed.error.errors);
		}

		// Transform DTO to domain model
		const updateData = fromUpdateTodoDTO(parsed.data as UpdateTodoDTO);

		// Call service with domain model
		const todo = await todoService.updateTodo(id, updateData, userId);

		if (!todo) {
			throw new NotFoundError('Todo not found');
		}

		// Transform domain model to response DTO
		const responseDTO = toTodoResponseDTO(todo);
		return reply.send(responseDTO);
	}

	async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		const { id } = request.params as { id: string };
		const deleted = await todoService.deleteTodo(id, userId);

		if (!deleted) {
			throw new NotFoundError('Todo not found');
		}

		return reply.code(204).send();
	}

	return {
		createHandler,
		getByIdHandler,
		getAllHandler,
		updateHandler,
		deleteHandler,
	};
}
