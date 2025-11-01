import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as drizzleMigrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../env.js';

/**
 * Run database migrations
 * @param connectionString - Optional connection string (defaults to env.DATABASE_URL)
 */
export async function migrate(connectionString?: string): Promise<void> {
	const dbUrl = connectionString || env.DATABASE_URL;
	const pool = new Pool({ connectionString: dbUrl });
	const db = drizzle(pool);

	console.log('Running migrations...');
	await drizzleMigrate(db, { migrationsFolder: './drizzle' });
	console.log('Migrations completed!');

	await pool.end();
}

// CLI entry point (when run directly)
async function runMigrations() {
	await migrate().catch(err => {
		console.error('Migration failed:', err);
		process.exit(1);
	});
}

// Only run if executed directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	runMigrations();
}
