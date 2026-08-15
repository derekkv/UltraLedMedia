import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  services: z.object({
    database: z.boolean(),
    redis: z.boolean(),
  }),
  timestamp: z.string(),
});

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness y estado de dependencias',
        response: { 200: HealthResponse, 503: HealthResponse },
      },
    },
    async (_request, reply) => {
      const [database, redisOk] = await Promise.all([
        prisma
          .$queryRaw`SELECT 1`.then(() => true)
          .catch(() => false),
        redis
          .ping()
          .then((res) => res === 'PONG')
          .catch(() => false),
      ]);

      const healthy = database && redisOk;
      return reply.status(healthy ? 200 : 503).send({
        status: healthy ? 'ok' : 'degraded',
        services: { database, redis: redisOk },
        timestamp: new Date().toISOString(),
      });
    },
  );
};
