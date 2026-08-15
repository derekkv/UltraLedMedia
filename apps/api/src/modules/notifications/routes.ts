import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { notificationCreateSchema } from '@ultraled/shared';
import { requireAuth, requireRole } from '../../security/rbac';
import { audit } from '../../security/audit';
import { createNotification, listNotifications, markNotificationRead } from './service';

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.unknown(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/notifications',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['notifications'],
        summary: 'Listar notificaciones propias',
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          unreadOnly: z.coerce.boolean().optional(),
        }),
        response: {
          200: z.object({
            items: z.array(notificationSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      return listNotifications({
        userId: request.currentUser!.id,
        cursor: request.query.cursor,
        limit: request.query.limit,
        unreadOnly: request.query.unreadOnly,
      });
    },
  );

  app.patch(
    '/notifications/:id/read',
    {
      preHandler: [requireAuth, app.csrfProtection],
      schema: {
        tags: ['notifications'],
        summary: 'Marcar notificación como leída',
        params: z.object({ id: z.uuid() }),
        response: { 200: notificationSchema },
      },
    },
    async (request) => {
      return markNotificationRead(request.currentUser!.id, request.params.id);
    },
  );

  app.post(
    '/notifications',
    {
      preHandler: [requireAuth, requireRole('ADMIN'), app.csrfProtection],
      schema: {
        tags: ['notifications'],
        summary: 'Crear/enviar notificación a un usuario (ADMIN)',
        body: notificationCreateSchema,
        response: { 201: notificationSchema },
      },
    },
    async (request, reply) => {
      const notification = await createNotification(request.body);
      await audit(request, {
        userId: request.currentUser?.id,
        action: 'NOTIFICATION_SENT',
        entity: 'notification',
        entityId: notification.id,
        metadata: { to: request.body.userId, type: request.body.type },
      });
      return reply.status(201).send(notification);
    },
  );
};
