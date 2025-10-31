/**
 * Parameter validation schemas for Fastify routes
 * These schemas ensure URL parameters are properly validated (e.g., UUID format)
 */

export const uuidParamSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'uuid',
		},
	},
	required: ['id'],
} as const;

export const paginationQuerySchema = {
	type: 'object',
	properties: {
		limit: {
			type: 'string',
			pattern: '^[0-9]+$',
			description: 'Number of items per page (default: 20, max: 100)',
		},
		cursor: {
			type: 'string',
			description: 'Cursor for pagination (UUID)',
		},
	},
} as const;
