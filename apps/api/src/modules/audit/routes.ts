import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../security/rbac';
import { listAuditLogs } from './service';

const auditLogDtoSchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string().nullable(),
  entityId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  actor: z
    .object({ id: z.string(), email: z.string(), fullName: z.string() })
    .nullable(),
  summary: z.string(),
  changes: z.record(z.string(), z.object({ from: z.unknown(), to: z.unknown() })).nullable(),
  snapshot: z.record(z.string(), z.unknown()).nullable(),
});

/** Visor de actividad (logs de auditoría). Solo administradores. */
export const auditRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('ADMIN'));

  app.get(
    '/audit-logs',
    {
      schema: {
        tags: ['audit'],
        summary: 'Listar registros de auditoría (paginación por cursor)',
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(30),
          entity: z.string().max(40).optional(),
          action: z.string().max(60).optional(),
          q: z.string().max(120).optional(),
        }),
        response: {
          200: z.object({
            items: z.array(auditLogDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      return listAuditLogs({
        cursor: request.query.cursor,
        limit: request.query.limit,
        entity: request.query.entity,
        action: request.query.action,
        q: request.query.q,
      });
    },
  );
};
