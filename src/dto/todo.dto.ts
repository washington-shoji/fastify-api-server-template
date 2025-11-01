/**
 * Todo DTOs (Data Transfer Objects)
 * DTOs represent the API contract and transform between domain models and API responses
 */

export interface CreateTodoDTO {
	title: string;
	description?: string | null;
	completed?: boolean;
}

export interface UpdateTodoDTO {
	title?: string;
	description?: string | null;
	completed?: boolean;
}

export interface TodoResponseDTO {
	id: string;
	title: string;
	description: string | null;
	completed: boolean;
	created_at: string; // ISO date string
	updated_at: string; // ISO date string
}

export interface TodoListResponseDTO {
	items: TodoResponseDTO[];
	nextCursor?: string | null;
	hasMore: boolean;
	count: number;
}

/**
 * Transform domain Todo to TodoResponseDTO
 * Removes sensitive fields like user_id and formats dates
 */
export function toTodoResponseDTO(todo: {
	id: string;
	title: string;
	description: string | null;
	completed: boolean;
	created_at: Date | string;
	updated_at: Date | string;
}): TodoResponseDTO {
	return {
		id: todo.id,
		title: todo.title,
		description: todo.description,
		completed: todo.completed,
		created_at:
			typeof todo.created_at === 'string'
				? todo.created_at
				: todo.created_at.toISOString(),
		updated_at:
			typeof todo.updated_at === 'string'
				? todo.updated_at
				: todo.updated_at.toISOString(),
	};
}

/**
 * Transform domain Todo array to TodoResponseDTO array
 */
export function toTodoResponseDTOArray(
	todos: Array<{
		id: string;
		title: string;
		description: string | null;
		completed: boolean;
		created_at: Date | string;
		updated_at: Date | string;
	}>
): TodoResponseDTO[] {
	return todos.map(toTodoResponseDTO);
}

/**
 * Transform CreateTodoDTO to domain CreateTodo
 */
export function fromCreateTodoDTO(dto: CreateTodoDTO): {
	title: string;
	description: string | null;
	completed: boolean;
} {
	return {
		title: dto.title,
		description: dto.description ?? null,
		completed: dto.completed ?? false,
	};
}

/**
 * Transform UpdateTodoDTO to domain UpdateTodo
 */
export function fromUpdateTodoDTO(dto: UpdateTodoDTO): {
	title?: string;
	description?: string | null;
	completed?: boolean;
} {
	const result: {
		title?: string;
		description?: string | null;
		completed?: boolean;
	} = {};

	if (dto.title !== undefined) {
		result.title = dto.title;
	}
	if (dto.description !== undefined) {
		result.description = dto.description ?? null;
	}
	if (dto.completed !== undefined) {
		result.completed = dto.completed;
	}

	return result;
}
