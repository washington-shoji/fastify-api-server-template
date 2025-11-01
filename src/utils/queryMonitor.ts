import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Query monitoring utilities for performance tracking
 * Helps identify slow queries and optimize database performance
 */

interface QueryMetric {
	timestamp: number;
	duration: number;
	query: string;
	error?: string;
}

class QueryMonitor {
	private slowQueryThreshold: number;
	private metrics: QueryMetric[] = [];
	private maxMetrics: number;

	constructor(slowQueryThreshold = 1000, maxMetrics = 1000) {
		this.slowQueryThreshold = slowQueryThreshold;
		this.maxMetrics = maxMetrics;
	}

	/**
	 * Log a query execution time
	 */
	logQuery(duration: number, query: string, error?: Error): void {
		const metric: QueryMetric = {
			timestamp: Date.now(),
			duration,
			query: this.sanitizeQuery(query),
			error: error?.message,
		};

		this.metrics.push(metric);

		// Keep only the most recent metrics
		if (this.metrics.length > this.maxMetrics) {
			this.metrics.shift();
		}
	}

	/**
	 * Get slow queries (queries exceeding threshold)
	 */
	getSlowQueries(): QueryMetric[] {
		return this.metrics.filter(
			(metric) => metric.duration > this.slowQueryThreshold && !metric.error
		);
	}

	/**
	 * Get failed queries
	 */
	getFailedQueries(): QueryMetric[] {
		return this.metrics.filter((metric) => metric.error !== undefined);
	}

	/**
	 * Get recent queries
	 */
	getRecentQueries(limit = 100): QueryMetric[] {
		return this.metrics.slice(-limit);
	}

	/**
	 * Get average query duration
	 */
	getAverageDuration(): number {
		if (this.metrics.length === 0) return 0;

		const total = this.metrics.reduce(
			(sum, metric) => sum + metric.duration,
			0
		);
		return total / this.metrics.length;
	}

	/**
	 * Sanitize query for logging (remove sensitive data)
	 */
	private sanitizeQuery(query: string): string {
		// Remove potential sensitive data from query strings
		// This is a simple implementation - adjust based on your needs
		return query
			.replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
			.replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'");
	}

	/**
	 * Clear metrics
	 */
	clear(): void {
		this.metrics = [];
	}
}

// Singleton instance
let queryMonitorInstance: QueryMonitor | null = null;

/**
 * Get or create query monitor instance
 */
export function getQueryMonitor(
	slowQueryThreshold?: number,
	maxMetrics?: number
): QueryMonitor {
	if (!queryMonitorInstance) {
		queryMonitorInstance = new QueryMonitor(slowQueryThreshold, maxMetrics);
	}
	return queryMonitorInstance;
}

/**
 * Setup query monitoring for Fastify app
 */
export function setupQueryMonitoring(
	app: FastifyInstance,
	slowQueryThreshold = 1000
): void {
	const monitor = getQueryMonitor(slowQueryThreshold);

	// Hook to log slow queries
	app.addHook('onResponse', async (request: FastifyRequest, reply) => {
		const duration = reply.getResponseTime();

		if (duration > slowQueryThreshold) {
			request.log.warn(
				{
					url: request.url,
					method: request.method,
					duration,
					statusCode: reply.statusCode,
				},
				`Slow request: ${request.method} ${request.url} took ${duration}ms`
			);
		}
	});

	// Expose query monitor metrics endpoint (optional, for internal use)
	// Protected endpoint - should be behind authentication in production
	app.get('/internal/metrics/queries', async (request, reply) => {
		// In production, add authentication here
		// For now, this is internal-only and should be protected by network/firewall
		return reply.send({
			slowQueries: monitor.getSlowQueries().slice(-50), // Last 50 slow queries
			failedQueries: monitor.getFailedQueries().slice(-50), // Last 50 failed queries
			averageDuration: monitor.getAverageDuration(),
			totalQueries: monitor.getRecentQueries().length,
			threshold: slowQueryThreshold,
		});
	});
}
