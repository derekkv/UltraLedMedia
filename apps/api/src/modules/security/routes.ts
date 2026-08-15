import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

/**
 * Entrega un token CSRF ligado a la sesión actual.
 * El cliente debe enviarlo en el header (por defecto `x-csrf-token`)
 * en cada mutación protegida.
 */
export const securityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/csrf',
    {
      schema: {
        tags: ['security'],
        summary: 'Obtener token CSRF',
        response: { 200: z.object({ csrfToken: z.string() }) },
      },
    },
    async (_request, reply) => {
      const csrfToken = reply.generateCsrf();
      return { csrfToken };
    },
  );
};
