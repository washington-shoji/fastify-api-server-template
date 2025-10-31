import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../env.js';

async function runMigrations() {
	const pool = new Pool({ connectionString: env.DATABASE_URL });
	const db = drizzle(pool);

	console.log('Running migrations...');
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('Migrations completed!');

	await pool.end();
}

runMigrations().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
