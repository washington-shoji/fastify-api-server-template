import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js';
import * as usersSchema from './schema/users';
import * as todosSchema from './schema/todos';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, {
	schema: {
		...usersSchema,
		...todosSchema,
	},
});

export { usersSchema, todosSchema };
