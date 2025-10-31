import type {
	Todo,
	CreateTodo,
	UpdateTodo,
} from '../domain/todo/todo.schema.js';

export function createTodoService(deps: {
	createTodo: (data: CreateTodo, userId: string) => Promise<Todo>;
	getTodoById: (id: string, userId: string) => Promise<Todo | null>;
	getAllTodos: (userId: string) => Promise<Todo[]>;
	updateTodo: (
		id: string,
		data: UpdateTodo,
		userId: string
	) => Promise<Todo | null>;
	deleteTodo: (id: string, userId: string) => Promise<boolean>;
}) {
	return {
		async createTodo(data: CreateTodo, userId: string): Promise<Todo> {
			return deps.createTodo(data, userId);
		},

		async getTodoById(id: string, userId: string): Promise<Todo | null> {
			return deps.getTodoById(id, userId);
		},

		async getAllTodos(userId: string): Promise<Todo[]> {
			return deps.getAllTodos(userId);
		},

		async updateTodo(
			id: string,
			data: UpdateTodo,
			userId: string
		): Promise<Todo | null> {
			const existing = await deps.getTodoById(id, userId);
			if (!existing) return null;
			return deps.updateTodo(id, data, userId);
		},

		async deleteTodo(id: string, userId: string): Promise<boolean> {
			const existing = await deps.getTodoById(id, userId);
			if (!existing) return false;
			return deps.deleteTodo(id, userId);
		},
	};
}
