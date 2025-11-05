/**
 * ⚠️ DISCLAIMER: This script is for E2E testing purposes only.
 *
 * This utility script must be removed or disabled before deploying to production.
 * This script is included solely to facilitate easy end-to-end testing of the API
 * by allowing deletion of all users from the database.
 *
 * WARNING: This script will delete ALL users and their associated data (todos, API keys).
 * DO NOT use this script in production environments.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from '../src/db/schema/users.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteAllUsers() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error('DATABASE_URL not set');
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);

	try {
		// Get count before deletion
		const allUsers = await db.select().from(users);
		const count = allUsers.length;

		if (count === 0) {
			console.log('No users found in database');
			await pool.end();
			return;
		}

		console.log(`Found ${count} user(s) to delete:`);
		allUsers.forEach(user => {
			console.log(`  - ${user.userName} (${user.email})`);
		});

		// Delete all users (todos and API keys will be cascade deleted)
		await db.delete(users);

		console.log(
			`\n✅ Successfully deleted ${count} user(s) and their related data (todos, API keys)`
		);
	} catch (error) {
		console.error('Error deleting users:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

deleteAllUsers();
