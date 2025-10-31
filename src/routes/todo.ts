import type { FastifyInstance } from 'fastify';
import { createTodoRepository } from '../repositories/todoRepository.js';
import { createTodoService } from '../services/todoService.js';
import { createTodoController } from '../controllers/todoController.js';
import {
	uuidParamSchema,
	paginationQuerySchema,
} from '../validators/params.validator.js';

export async function todoRoutes(app: FastifyInstance) {
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
		'/todos',
		{ preValidation: [app.authenticate] },
		controller.createHandler
	);
	app.get(
		'/todos',
		{
			preValidation: [app.authenticate],
			schema: {
				querystring: paginationQuerySchema,
			},
		},
		controller.getAllHandler
	);
	app.get(
		'/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.getByIdHandler
	);
	app.put(
		'/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.updateHandler
	);
	app.delete(
		'/todos/:id',
		{
			preValidation: [app.authenticate],
			schema: {
				params: uuidParamSchema,
			},
		},
		controller.deleteHandler
	);
}
