import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../env.js';

async function jwtPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: 'access_token',
      signed: false
    }
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ message: 'Unauthorized' });
      }
    }
  );

  app.decorate('signAccessToken', async (payload: object) => {
    return app.jwt.sign(payload, { expiresIn: env.ACCESS_TOKEN_TTL });
  });

  app.decorate('signRefreshToken', async (payload: object) => {
    return app.jwt.sign(payload, {
      expiresIn: env.REFRESH_TOKEN_TTL
    });
  });

  app.decorate('verifyRefreshToken', async (token: string) => {
    return app.jwt.verify(token);
  });
}

export default fp(jwtPlugin, { name: 'jwt-plugin' });


