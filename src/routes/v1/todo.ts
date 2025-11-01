import type { FastifyInstance } from 'fastify';
import { createTodoRepository } from '../../repositories/todoRepository.js';
import { createTodoService } from '../../services/todoService.js';
import { createTodoController } from '../../controllers/todoController.js';
import {
	uuidParamSchema,
	paginationQuerySchema,
} from '../../validators/params.validator.js';

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
		},
		controller.createHandler
	);

	app.get(
		'/v1/todos',
		{
			preValidation: [app.authenticate],
			schema: {
				querystring: paginationQuerySchema,
			},
		},
		controller.getAllHandler
	);

	app.get(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.getByIdHandler
	);

	app.put(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.updateHandler
	);

	app.delete(
		'/v1/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.deleteHandler
	);
}
