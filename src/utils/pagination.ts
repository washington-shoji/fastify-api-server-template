/**
 * Pagination utilities for list endpoints
 * Supports cursor-based pagination for better performance
 */

export interface PaginationParams {
	cursor?: string;
	limit?: number;
}

export interface PaginatedResult<T> {
	items: T[];
	nextCursor?: string;
	hasMore: boolean;
	count: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(query: {
	cursor?: string;
	limit?: string;
}): PaginationParams {
	const limit = query.limit
		? Math.min(Math.max(parseInt(query.limit, 10), 1), MAX_LIMIT)
		: DEFAULT_LIMIT;

	return {
		cursor: query.cursor,
		limit,
	};
}

/**
 * Validate cursor format (should be UUID for time-ordered IDs)
 */
export function validateCursor(cursor: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(cursor);
}
