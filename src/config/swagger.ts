import type { FastifySwaggerOptions } from '@fastify/swagger';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { env } from '../env.js';

export const swaggerOptions = {
	mode: 'dynamic',
	openapi: {
		openapi: '3.0.0',
		info: {
			title: 'Fastify API Template',
			description:
				'Production-ready Fastify API template with comprehensive features',
			version: '1.0.0',
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server',
			},
		],
		tags: [
			{
				name: 'health',
				description: 'Health check endpoints',
			},
			{
				name: 'auth',
				description: 'Authentication endpoints',
			},
			{
				name: 'todos',
				description: 'Todo CRUD operations',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT access token',
				},
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'access_token',
					description: 'JWT access token in cookie',
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
			{
				cookieAuth: [],
			},
		],
	},
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
	routePrefix: '/docs',
	uiConfig: {
		docExpansion: 'list',
		deepLinking: true,
	},
	uiHooks: {
		onRequest: function (request, reply, next) {
			next();
		},
		preHandler: function (request, reply, next) {
			next();
		},
	},
	staticCSP: true,
	transformStaticCSP: (header) => header,
	transformSpecification: (swaggerObject, req, reply) => {
		return swaggerObject;
	},
	transformSpecificationClone: true,
};
