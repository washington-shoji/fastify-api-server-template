import { z } from 'zod';

export const UserSchema = z.object({
	id: z.string().uuid(),
	user_name: z.string().min(1).max(255),
	email: z.string().email(),
	password: z.string().min(8), // Minimum 8 characters for password
});

export const CreateUserSchema = UserSchema.omit({
	id: true,
});

export const UpdateUserSchema = UserSchema.partial().omit({
	id: true,
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
