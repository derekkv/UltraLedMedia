import type { FastifyError, FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';

/**
 * Registra el manejador de errores global con envelope consistente:
 * { error: { code, message, details? } }
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Errores de validación de request (Zod)
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La solicitud no pasó la validación.',
          details: error.validation,
        },
      });
    }

    // Errores de serialización de response (no filtrar detalles al cliente)
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'Error de serialización de respuesta');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
      });
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Error no controlado');
    }

    return reply.status(statusCode).send({
      error: {
        code: error.code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        message: statusCode >= 500 ? 'Error interno del servidor.' : error.message,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Ruta no encontrada: ${request.method} ${request.url}`,
      },
    });
  });
}
