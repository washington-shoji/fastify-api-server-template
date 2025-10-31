import type { Pool } from 'pg';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signAccessToken: (payload: object) => Promise<string>;
    signRefreshToken: (payload: object) => Promise<string>;
    verifyRefreshToken: (token: string) => Promise<unknown>;
  }

  interface FastifyRequest {
    user: {
      sub?: string;
      email?: string;
      iat?: number;
      exp?: number;
      [key: string]: unknown;
    };
  }
}


