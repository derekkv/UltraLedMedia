import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface AuditInput {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Registra un evento en `audit_logs`. No lanza: si falla, solo loguea
 * para no romper el flujo de negocio.
 */
export async function audit(request: FastifyRequest, input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: input.metadata ?? {},
      },
    });
  } catch (err) {
    request.log.error({ err }, 'No se pudo registrar el evento de auditoría');
  }
}
