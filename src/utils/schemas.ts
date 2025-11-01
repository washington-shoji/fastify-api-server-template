/**
 * JSON schemas for Swagger/OpenAPI documentation
 * These schemas are generated from Zod schemas for API documentation
 */

export const createTodoSchema = {
	type: 'object',
	properties: {
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 255,
			description: 'Todo title',
		},
		description: {
			type: 'string',
			nullable: true,
			description: 'Todo description',
		},
		completed: {
			type: 'boolean',
			default: false,
			description: 'Whether the todo is completed',
		},
	},
	required: ['title'],
} as const;

export const updateTodoSchema = {
	type: 'object',
	properties: {
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 255,
			description: 'Todo title',
		},
		description: {
			type: 'string',
			nullable: true,
			description: 'Todo description',
		},
		completed: {
			type: 'boolean',
			description: 'Whether the todo is completed',
		},
	},
} as const;

export const todoResponseSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'uuid',
			description: 'Todo ID',
		},
		title: {
			type: 'string',
			description: 'Todo title',
		},
		description: {
			type: 'string',
			nullable: true,
			description: 'Todo description',
		},
		completed: {
			type: 'boolean',
			description: 'Whether the todo is completed',
		},
		created_at: {
			type: 'string',
			format: 'date-time',
			description: 'Creation timestamp',
		},
		updated_at: {
			type: 'string',
			format: 'date-time',
			description: 'Last update timestamp',
		},
	},
	required: ['id', 'title', 'completed', 'created_at', 'updated_at'],
} as const;

export const todoListResponseSchema = {
	type: 'object',
	properties: {
		items: {
			type: 'array',
			items: todoResponseSchema,
		},
		nextCursor: {
			type: 'string',
			format: 'uuid',
			nullable: true,
			description: 'Cursor for next page',
		},
		hasMore: {
			type: 'boolean',
			description: 'Whether there are more items',
		},
		count: {
			type: 'number',
			description: 'Number of items in current page',
		},
	},
	required: ['items', 'hasMore', 'count'],
} as const;

export const registerSchema = {
	type: 'object',
	properties: {
		user_name: {
			type: 'string',
			minLength: 1,
			maxLength: 255,
			description: 'Username',
		},
		email: {
			type: 'string',
			format: 'email',
			description: 'User email',
		},
		password: {
			type: 'string',
			minLength: 8,
			description: 'Password (minimum 8 characters)',
		},
	},
	required: ['user_name', 'email', 'password'],
} as const;

export const loginSchema = {
	type: 'object',
	properties: {
		identifier: {
			type: 'string',
			minLength: 1,
			description: 'Email or username',
		},
		password: {
			type: 'string',
			minLength: 1,
			description: 'Password',
		},
	},
	required: ['identifier', 'password'],
} as const;

export const issueTokenSchema = {
	type: 'object',
	properties: {
		userId: {
			type: 'string',
			format: 'uuid',
			description: 'User ID',
		},
		email: {
			type: 'string',
			format: 'email',
			description: 'User email (optional)',
		},
	},
	required: ['userId'],
} as const;

export const tokenResponseSchema = {
	type: 'object',
	properties: {
		accessToken: {
			type: 'string',
			description: 'JWT access token',
		},
		refreshToken: {
			type: 'string',
			description: 'JWT refresh token',
		},
	},
	required: ['accessToken', 'refreshToken'],
} as const;

export const refreshTokenSchema = {
	type: 'object',
	properties: {
		refreshToken: {
			type: 'string',
			description: 'Refresh token (optional if cookie present)',
		},
	},
} as const;

export const userResponseSchema = {
	type: 'object',
	properties: {
		sub: {
			type: 'string',
			format: 'uuid',
			description: 'User ID',
		},
		email: {
			type: 'string',
			format: 'email',
			nullable: true,
			description: 'User email',
		},
		iat: {
			type: 'number',
			description: 'Issued at timestamp',
		},
		exp: {
			type: 'number',
			description: 'Expiration timestamp',
		},
	},
	required: ['sub'],
} as const;

export const errorResponseSchema = {
	type: 'object',
	properties: {
		message: {
			type: 'string',
			description: 'Error message',
		},
		errors: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					path: {
						type: 'array',
						items: {
							oneOf: [{ type: 'string' }, { type: 'number' }],
						},
					},
					message: {
						type: 'string',
					},
				},
			},
			description: 'Validation errors (only for ValidationError)',
		},
	},
	required: ['message'],
} as const;

export const healthResponseSchema = {
	type: 'object',
	properties: {
		status: {
			type: 'string',
			enum: ['ok', 'error'],
			description: 'Health status',
		},
		timestamp: {
			type: 'string',
			format: 'date-time',
			description: 'Current timestamp',
		},
		checks: {
			type: 'object',
			properties: {
				database: {
					type: 'string',
					enum: ['healthy', 'unhealthy'],
					description: 'Database connectivity status',
				},
			},
		},
	},
	required: ['status', 'timestamp'],
} as const;
