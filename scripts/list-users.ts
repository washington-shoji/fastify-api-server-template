/**
 * ⚠️ DISCLAIMER: This script is for E2E testing purposes only.
 *
 * This utility script must be removed or disabled before deploying to production.
 * This script is included solely to facilitate easy end-to-end testing of the API
 * by allowing listing of all users in the database.
 *
 * DO NOT use this script in production environments.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from '../src/db/schema/users.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error('DATABASE_URL not set');
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);

	try {
		const allUsers = await db.select().from(users);

		if (allUsers.length === 0) {
			console.log('No users found in database');
			await pool.end();
			return;
		}

		console.log(`\nFound ${allUsers.length} user(s):\n`);
		console.log(
			'ID'.padEnd(40) +
				'Username'.padEnd(20) +
				'Email'.padEnd(30) +
				'Created At'
		);
		console.log('-'.repeat(110));

		for (const user of allUsers) {
			console.log(
				user.id.substring(0, 36) +
					'...'.padEnd(4) +
					user.userName.padEnd(20) +
					user.email.padEnd(30) +
					user.createdAt.toISOString().split('T')[0]
			);
		}

		console.log('\n');
	} catch (error) {
		console.error('Error listing users:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

listUsers();
