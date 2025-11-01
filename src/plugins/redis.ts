import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Redis from 'ioredis';
import { env } from '../env.js';
import fp from 'fastify-plugin';

export interface RedisPluginOptions extends FastifyPluginOptions {
	enabled?: boolean;
}

async function redisPlugin(app: FastifyInstance, _opts: RedisPluginOptions) {
	// Check if Redis is enabled (optional)
	if (!env.REDIS_URL && !env.REDIS_HOST) {
		app.log.warn('Redis not configured - caching disabled');
		// Create a no-op cache service
		app.decorate('cache', {
			async get<T>(_key: string): Promise<T | null> {
				return null;
			},
			async set<T>(
				_key: string,
				_value: T,
				_ttlSeconds?: number
			): Promise<boolean> {
				return true;
			},
			async del(_key: string): Promise<boolean> {
				return true;
			},
			async delPattern(_pattern: string): Promise<number> {
				return 0;
			},
			async exists(_key: string): Promise<boolean> {
				return false;
			},
			async flush(): Promise<boolean> {
				return true;
			},
			async getOrSet<T>(
				_key: string,
				fetcher: () => Promise<T>,
				_ttlSeconds?: number
			): Promise<T> {
				return fetcher();
			},
		});
		return;
	}

	let redisClient: Redis;

	try {
		// Create Redis client
		if (env.REDIS_URL) {
			redisClient = new Redis(env.REDIS_URL, {
				maxRetriesPerRequest: 3,
				retryStrategy: times => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
			});
		} else {
			redisClient = new Redis({
				host: env.REDIS_HOST || 'localhost',
				port: env.REDIS_PORT || 6379,
				password: env.REDIS_PASSWORD,
				maxRetriesPerRequest: 3,
				retryStrategy: times => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
			});
		}

		// Test connection
		await redisClient.ping();
		app.log.info('Redis connected successfully');

		// Handle Redis errors
		redisClient.on('error', error => {
			app.log.error({ err: error }, 'Redis connection error');
		});

		redisClient.on('connect', () => {
			app.log.info('Redis connection established');
		});

		redisClient.on('ready', () => {
			app.log.info('Redis client ready');
		});

		redisClient.on('close', () => {
			app.log.warn('Redis connection closed');
		});

		// Create cache service
		const cacheService = {
			/**
			 * Get a value from cache
			 */
			async get<T>(key: string): Promise<T | null> {
				try {
					const value = await redisClient.get(key);
					if (!value) return null;
					return JSON.parse(value) as T;
				} catch (error) {
					app.log.error({ err: error, key }, 'Cache get error');
					return null;
				}
			},

			/**
			 * Set a value in cache
			 */
			async set<T>(
				key: string,
				value: T,
				ttlSeconds?: number
			): Promise<boolean> {
				try {
					const ttl = ttlSeconds || env.REDIS_TTL || 3600; // Default 1 hour
					const serialized = JSON.stringify(value);
					await redisClient.setex(key, ttl, serialized);
					return true;
				} catch (error) {
					app.log.error({ err: error, key }, 'Cache set error');
					return false;
				}
			},

			/**
			 * Delete a key from cache
			 */
			async del(key: string): Promise<boolean> {
				try {
					await redisClient.del(key);
					return true;
				} catch (error) {
					app.log.error({ err: error, key }, 'Cache del error');
					return false;
				}
			},

			/**
			 * Delete multiple keys matching a pattern
			 */
			async delPattern(pattern: string): Promise<number> {
				try {
					const stream = redisClient.scanStream({
						match: pattern,
					});
					const keys: string[] = [];
					stream.on('data', resultKeys => {
						keys.push(...resultKeys);
					});
					await new Promise(resolve => {
						stream.on('end', resolve);
					});
					if (keys.length > 0) {
						await redisClient.del(...keys);
					}
					return keys.length;
				} catch (error) {
					app.log.error({ err: error, pattern }, 'Cache delPattern error');
					return 0;
				}
			},

			/**
			 * Check if a key exists
			 */
			async exists(key: string): Promise<boolean> {
				try {
					const result = await redisClient.exists(key);
					return result === 1;
				} catch (error) {
					app.log.error({ err: error, key }, 'Cache exists error');
					return false;
				}
			},

			/**
			 * Flush all cache (use with caution!)
			 */
			async flush(): Promise<boolean> {
				try {
					await redisClient.flushdb();
					return true;
				} catch (error) {
					app.log.error({ err: error }, 'Cache flush error');
					return false;
				}
			},

			/**
			 * Get or set pattern - fetch from cache or compute and cache
			 */
			async getOrSet<T>(
				key: string,
				fetcher: () => Promise<T>,
				ttlSeconds?: number
			): Promise<T> {
				const cached = await cacheService.get<T>(key);
				if (cached !== null) {
					return cached;
				}
				const value = await fetcher();
				await cacheService.set(key, value, ttlSeconds);
				return value;
			},

			/**
			 * Close Redis connection
			 */
			async close(): Promise<void> {
				await redisClient.quit();
			},
		};

		// Decorate Fastify instance with cache
		app.decorate('cache', cacheService);

		// Close Redis connection on app close
		app.addHook('onClose', async () => {
			await redisClient.quit();
			app.log.info('Redis connection closed');
		});
	} catch (error) {
		app.log.error({ err: error }, 'Failed to connect to Redis');
		// Create a no-op cache service on error
		app.decorate('cache', {
			async get<T>(_key: string): Promise<T | null> {
				return null;
			},
			async set<T>(
				_key: string,
				_value: T,
				_ttlSeconds?: number
			): Promise<boolean> {
				return true;
			},
			async del(_key: string): Promise<boolean> {
				return true;
			},
			async delPattern(_pattern: string): Promise<number> {
				return 0;
			},
			async exists(_key: string): Promise<boolean> {
				return false;
			},
			async flush(): Promise<boolean> {
				return true;
			},
			async getOrSet<T>(
				_key: string,
				fetcher: () => Promise<T>,
				_ttlSeconds?: number
			): Promise<T> {
				return fetcher();
			},
		});
	}
}

export default fp(redisPlugin, {
	name: 'redis-cache',
});

declare module 'fastify' {
	interface FastifyInstance {
		cache: {
			get<T>(key: string): Promise<T | null>;
			set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
			del(key: string): Promise<boolean>;
			delPattern(pattern: string): Promise<number>;
			exists(key: string): Promise<boolean>;
			flush(): Promise<boolean>;
			getOrSet<T>(
				key: string,
				fetcher: () => Promise<T>,
				ttlSeconds?: number
			): Promise<T>;
			close?(): Promise<void>;
		};
	}
}
