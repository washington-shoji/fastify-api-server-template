/**
 * Service definitions using DI container
 * This demonstrates how to use the DI container pattern
 */

import type { FastifyInstance } from 'fastify';
import { container } from './container.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createTodoRepository } from '../repositories/todoRepository.js';
import { createAuthService } from '../services/authService.js';
import { createTodoService } from '../services/todoService.js';
import { createAuthController } from '../controllers/authController.js';
import { createTodoController } from '../controllers/todoController.js';

/**
 * Register all services in the DI container
 * This provides a centralized dependency management
 */
export function registerServices(app: FastifyInstance): void {
	// Register repositories
	container.register('userRepository', () => createUserRepository(app), true);
	container.register('todoRepository', () => createTodoRepository(app), true);

	// Register services (with dependencies)
	container.register(
		'authService',
		() => {
			const repo =
				container.resolve<ReturnType<typeof createUserRepository>>(
					'userRepository'
				);
			return createAuthService(app, {
				getUserById: (id) => repo.getById(id),
			});
		},
		true
	);

	container.register(
		'todoService',
		() => {
			const repo =
				container.resolve<ReturnType<typeof createTodoRepository>>(
					'todoRepository'
				);
			return createTodoService({
				createTodo: (data, userId) => repo.create(data, userId),
				getTodoById: (id, userId) => repo.getById(id, userId),
				getAllTodos: (userId, pagination) => repo.getAll(userId, pagination),
				updateTodo: (id, data, userId) => repo.update(id, data, userId),
				deleteTodo: (id, userId) => repo.delete(id, userId),
			});
		},
		true
	);

	// Register controllers (with dependencies)
	container.register(
		'authController',
		() => {
			const service =
				container.resolve<ReturnType<typeof createAuthService>>('authService');
			return createAuthController(app, service);
		},
		true
	);

	container.register(
		'todoController',
		() => {
			const service =
				container.resolve<ReturnType<typeof createTodoService>>('todoService');
			return createTodoController(app, service);
		},
		true
	);
}

/**
 * Get services from container (convenience functions)
 * These can be used in routes instead of manual wiring
 */
export function getAuthController() {
	return container.resolve<ReturnType<typeof createAuthController>>(
		'authController'
	);
}

export function getTodoController() {
	return container.resolve<ReturnType<typeof createTodoController>>(
		'todoController'
	);
}
