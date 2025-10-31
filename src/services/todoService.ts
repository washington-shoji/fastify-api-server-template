import type {
	CreateTodo,
	UpdateTodo,
	TodoResponse,
} from '../domain/todo/todo.schema.js';

export function createTodoService(deps: {
	createTodo: (data: CreateTodo, userId: string) => Promise<TodoResponse>;
	getTodoById: (id: string, userId: string) => Promise<TodoResponse | null>;
	getAllTodos: (userId: string) => Promise<TodoResponse[]>;
	updateTodo: (
		id: string,
		data: UpdateTodo,
		userId: string
	) => Promise<TodoResponse | null>;
	deleteTodo: (id: string, userId: string) => Promise<boolean>;
}) {
	return {
		async createTodo(data: CreateTodo, userId: string): Promise<TodoResponse> {
			return deps.createTodo(data, userId);
		},

		async getTodoById(
			id: string,
			userId: string
		): Promise<TodoResponse | null> {
			return deps.getTodoById(id, userId);
		},

		async getAllTodos(userId: string): Promise<TodoResponse[]> {
			return deps.getAllTodos(userId);
		},

		async updateTodo(
			id: string,
			data: UpdateTodo,
			userId: string
		): Promise<TodoResponse | null> {
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
