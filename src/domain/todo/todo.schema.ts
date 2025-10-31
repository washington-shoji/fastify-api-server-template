import { z } from 'zod';

export const TodoSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	title: z.string().min(1).max(255),
	description: z.string().nullable(),
	completed: z.boolean().default(false),
	created_at: z.date(),
	updated_at: z.date(),
});

export const CreateTodoSchema = TodoSchema.omit({
	id: true,
	user_id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateTodoSchema = TodoSchema.partial().omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodo = z.infer<typeof CreateTodoSchema>;
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;
