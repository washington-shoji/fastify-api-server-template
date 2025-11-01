import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
	PORT: z.string().default('3000'),
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),
	DATABASE_URL: z.string().url(),
	JWT_ACCESS_SECRET: z.string().min(32),
	JWT_REFRESH_SECRET: z.string().min(32),
	ACCESS_TOKEN_TTL: z.string().default('15m'),
	REFRESH_TOKEN_TTL: z.string().default('7d'),
	COOKIE_DOMAIN: z.string().default('localhost'),
	COOKIE_SECURE: z
		.union([z.literal('true'), z.literal('false')])
		.default('false'),
	// CORS configuration
	CORS_ORIGIN: z.string().optional(), // Comma-separated list of allowed origins
	// Database pool configuration
	DB_POOL_MIN: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
	DB_POOL_MAX: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
	// Rate limiting configuration
	RATE_LIMIT_MAX: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
	RATE_LIMIT_TIME_WINDOW: z.string().optional(),
	// Logging configuration
	LOG_LEVEL: z
		.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
		.optional(),
	// Query monitoring configuration
	SLOW_QUERY_THRESHOLD: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error(
		'Invalid environment variables:',
		parsed.error.flatten().fieldErrors
	);
	process.exit(1);
}

export const env = {
	...parsed.data,
	PORT_NUMBER: Number(parsed.data.PORT),
	// Parse CORS origins - if not provided, use defaults based on environment
	CORS_ORIGINS: parsed.data.CORS_ORIGIN
		? parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim())
		: parsed.data.NODE_ENV === 'production'
		? [] // Production requires explicit origins
		: true, // Development allows all origins
};
