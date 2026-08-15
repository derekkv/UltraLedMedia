import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { userCreateSchema, userUpdateSchema } from '@ultraled/shared';
import { requireAuth, requireRole } from '../../security/rbac';
import { audit } from '../../security/audit';
import { createUser, getUser, listUsers, updateUser } from './service';

const userSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  roles: z.array(z.string()),
});

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  // Todas las rutas requieren sesión válida y rol ADMIN.
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('ADMIN'));

  app.get(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Listar usuarios (paginación por cursor)',
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            items: z.array(userSummarySchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      return listUsers({ cursor: request.query.cursor, limit: request.query.limit });
    },
  );

  app.get(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Detalle de usuario',
        params: z.object({ id: z.uuid() }),
        response: { 200: userSummarySchema },
      },
    },
    async (request) => {
      return getUser(request.params.id);
    },
  );

  app.post(
    '/users',
    {
      preHandler: [app.csrfProtection],
      schema: {
        tags: ['users'],
        summary: 'Crear usuario',
        body: userCreateSchema,
        response: { 201: userSummarySchema },
      },
    },
    async (request, reply) => {
      const user = await createUser(request.body);
      await audit(request, {
        userId: request.currentUser?.id,
        action: 'USER_CREATED',
        entity: 'user',
        entityId: user.id,
        metadata: { email: user.email, roles: user.roles },
      });
      return reply.status(201).send(user);
    },
  );

  app.patch(
    '/users/:id',
    {
      preHandler: [app.csrfProtection],
      schema: {
        tags: ['users'],
        summary: 'Editar usuario (datos, estado, roles, contraseña)',
        params: z.object({ id: z.uuid() }),
        body: userUpdateSchema,
        response: { 200: userSummarySchema },
      },
    },
    async (request, reply) => {
      const user = await updateUser(request.params.id, request.body);
      await audit(request, {
        userId: request.currentUser?.id,
        action: 'USER_UPDATED',
        entity: 'user',
        entityId: user.id,
        metadata: { fields: Object.keys(request.body) },
      });
      return reply.send(user);
    },
  );
};
