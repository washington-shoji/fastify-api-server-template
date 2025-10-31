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

export function createTodoController(
	app: FastifyInstance,
	todoService: ReturnType<typeof createTodoService>
) {
	async function createHandler(request: FastifyRequest, reply: FastifyReply) {
		const userId = request.userId;
		if (!userId) {
			throw new UnauthorizedError();
		}

		const parsed = CreateTodoSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new ValidationError('Invalid request body', parsed.error.errors);
		}

		const todo = await todoService.createTodo(parsed.data, userId);
		return reply.code(201).send(todo);
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

		return reply.send(todo);
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
		return reply.send(result);
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

		const todo = await todoService.updateTodo(id, parsed.data, userId);

		if (!todo) {
			throw new NotFoundError('Todo not found');
		}

		return reply.send(todo);
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
