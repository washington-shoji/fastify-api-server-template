import { z } from 'zod';

export const UserSchema = z.object({
	id: z.string(),
	email: z.string().email().nullable(),
});

export type User = z.infer<typeof UserSchema>;
