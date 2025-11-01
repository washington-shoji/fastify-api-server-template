import type { FastifyInstance } from 'fastify';
import { createTodoRepository } from '../../repositories/todoRepository.js';
import { createTodoService } from '../../services/todoService.js';
import { createTodoController } from '../../controllers/todoController.js';
import {
	uuidParamSchema,
	paginationQuerySchema,
} from '../../validators/params.validator.js';
import {
	createTodoSchema,
	updateTodoSchema,
	todoResponseSchema,
	todoListResponseSchema,
	errorResponseSchema,
} from '../../utils/schemas.js';

/**
 * Version 1 Todo routes
 * API versioning strategy: /v1/todos
 */
export async function todoV1Routes(app: FastifyInstance) {
	const repo = createTodoRepository(app);
	const service = createTodoService({
		createTodo: (data, userId) => repo.create(data, userId),
		getTodoById: (id, userId) => repo.getById(id, userId),
		getAllTodos: (userId, pagination) => repo.getAll(userId, pagination),
		updateTodo: (id, data, userId) => repo.update(id, data, userId),
		deleteTodo: (id, userId) => repo.delete(id, userId),
	});
	const controller = createTodoController(app, service);

	app.post(
		'/v1/todos',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Create a new todo',
				tags: ['todos'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				body: createTodoSchema,
				response: {
					201: todoResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
				},
			},
		},
		controller.createHandler
	);

	app.get(
		'/v1/todos',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Get all todos for the authenticated user with pagination',
				tags: ['todos'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				querystring: paginationQuerySchema,
				response: {
					200: todoListResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
				},
			},
		},
		controller.getAllHandler
	);

	app.get(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Get a specific todo by ID',
				tags: ['todos'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				params: uuidParamSchema,
				response: {
					200: todoResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		controller.getByIdHandler
	);

	app.put(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Update a todo',
				tags: ['todos'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				params: uuidParamSchema,
				body: updateTodoSchema,
				response: {
					200: todoResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		controller.updateHandler
	);

	app.delete(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				description: 'Delete a todo',
				tags: ['todos'],
				security: [{ bearerAuth: [] }, { cookieAuth: [] }],
				params: uuidParamSchema,
				response: {
					204: {
						type: 'null',
						description: 'No content',
					},
					400: errorResponseSchema,
					401: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		controller.deleteHandler
	);
}
