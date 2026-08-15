import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loginSchema } from '@ultraled/shared';
import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../security/hashing';
import { audit } from '../../security/audit';
import { loadCurrentUser } from '../../security/access';
import { requireAuth } from '../../security/rbac';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  isActive: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  modules: z.array(z.string()),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Iniciar sesión',
        body: loginSchema,
        response: {
          200: z.object({ user: currentUserSchema }),
          401: errorSchema,
          423: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const invalid = {
        error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña inválidos.' },
      };
      const now = new Date();

      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });

      if (!user || !user.isActive) {
        await audit(request, { action: 'LOGIN_FAILED', metadata: { email } });
        return reply.status(401).send(invalid);
      }

      if (user.lockedUntil && user.lockedUntil > now) {
        await audit(request, { userId: user.id, action: 'LOGIN_LOCKED' });
        return reply.status(423).send({
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Cuenta bloqueada temporalmente. Intenta más tarde.',
          },
        });
      }

      const passwordOk = await verifyPassword(user.passwordHash, password);
      if (!passwordOk) {
        const attempts = user.failedLoginAttempts + 1;
        const locked = attempts >= MAX_FAILED_ATTEMPTS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: locked ? new Date(now.getTime() + LOCK_DURATION_MS) : user.lockedUntil,
          },
        });
        await audit(request, { userId: user.id, action: 'LOGIN_FAILED', metadata: { attempts, locked } });
        return reply.status(401).send(invalid);
      }

      // Éxito: resetea contadores, actualiza último login, regenera la sesión.
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
      });
      await request.session.regenerate();
      request.session.userId = user.id;
      await audit(request, { userId: user.id, action: 'LOGIN_SUCCESS' });

      const current = await loadCurrentUser(user.id);
      if (!current) {
        return reply.status(401).send(invalid);
      }
      return reply.status(200).send({ user: current });
    },
  );

  app.post(
    '/auth/logout',
    {
      preHandler: [requireAuth, app.csrfProtection],
      schema: {
        tags: ['auth'],
        summary: 'Cerrar sesión',
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const userId = request.currentUser?.id;
      await request.session.destroy();
      await audit(request, { userId, action: 'LOGOUT' });
      return reply.send({ ok: true });
    },
  );

  app.get(
    '/auth/me',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['auth'],
        summary: 'Usuario autenticado actual',
        response: { 200: z.object({ user: currentUserSchema }), 401: errorSchema },
      },
    },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHENTICATED', message: 'No autenticado.' },
        });
      }
      return reply.send({ user });
    },
  );
};
