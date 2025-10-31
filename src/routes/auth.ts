import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';

export async function authRoutes(app: FastifyInstance) {
  const loginBodySchema = z.object({
    userId: z.string().min(1),
    email: z.string().email().optional()
  });

  app.post('/auth/token', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid body' });
    }

    const payload = { sub: parsed.data.userId, email: parsed.data.email };

    const accessToken = await app.signAccessToken(payload);
    const refreshToken = await app.signRefreshToken(payload);

    // Set httpOnly cookies for convenience; also return in body
    const commonCookie = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: env.COOKIE_SECURE === 'true',
      domain: env.COOKIE_DOMAIN,
      path: '/'
    };

    reply
      .setCookie('access_token', accessToken, {
        ...commonCookie,
        maxAge: 60 * 60 // 1 hour default; actual enforced by token exp
      })
      .setCookie('refresh_token', refreshToken, {
        ...commonCookie,
        maxAge: 7 * 24 * 60 * 60 // 7 days default; actual enforced by token exp
      });

    return { accessToken, refreshToken };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const tokenFromCookie = request.cookies?.refresh_token as string | undefined;
    const tokenFromBody = (request.body as any)?.refreshToken as string | undefined;
    const token = tokenFromBody || tokenFromCookie;
    if (!token) return reply.code(401).send({ message: 'Missing refresh token' });

    try {
      const payload = await app.verifyRefreshToken(token);
      const newAccess = await app.signAccessToken({ sub: (payload as any).sub, email: (payload as any).email });
      const newRefresh = await app.signRefreshToken({ sub: (payload as any).sub, email: (payload as any).email });

      const commonCookie = {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: env.COOKIE_SECURE === 'true',
        domain: env.COOKIE_DOMAIN,
        path: '/'
      };

      reply
        .setCookie('access_token', newAccess, { ...commonCookie, maxAge: 60 * 60 })
        .setCookie('refresh_token', newRefresh, { ...commonCookie, maxAge: 7 * 24 * 60 * 60 });

      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch {
      return reply.code(401).send({ message: 'Invalid refresh token' });
    }
  });

  app.get('/auth/me', { preValidation: [app.authenticate] }, async (request) => {
    return { user: request.user };
  });
}


