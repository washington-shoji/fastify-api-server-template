import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from '../src/db/schema/users.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteUser() {
	const email = 'usr1@email.com';
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error('DATABASE_URL not set');
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);

	try {
		// Find user by email
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!user) {
			console.log(`User with email ${email} not found`);
			await pool.end();
			return;
		}

		console.log(`Found user: ${user.userName} (${user.email})`);

		// Delete user (todos and API keys will be cascade deleted)
		await db.delete(users).where(eq(users.id, user.id));

		console.log(`User ${email} deleted successfully`);
	} catch (error) {
		console.error('Error deleting user:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

deleteUser();
