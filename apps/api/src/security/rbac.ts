import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ModuleKey, PermissionAction } from '@ultraled/shared';
import { permissionKey } from '@ultraled/shared';
import { loadCurrentUser } from './access';

function sendUnauthorized(reply: FastifyReply, message = 'No autenticado.'): void {
  void reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message } });
}

function sendForbidden(reply: FastifyReply, message = 'No autorizado.'): void {
  void reply.status(403).send({ error: { code: 'FORBIDDEN', message } });
}

/**
 * preHandler: exige sesión válida y carga `request.currentUser`.
 * Debe ir primero en la cadena de preHandlers de una ruta protegida.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.session.userId;
  if (!userId) {
    sendUnauthorized(reply);
    return;
  }

  const user = await loadCurrentUser(userId);
  if (!user || !user.isActive) {
    await request.session.destroy();
    sendUnauthorized(reply, 'Sesión inválida.');
    return;
  }

  request.currentUser = user;
}

/** preHandler factory: exige que el usuario tenga al menos uno de los roles dados. */
export function requireRole(...roles: string[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.currentUser;
    if (!user) {
      sendUnauthorized(reply);
      return;
    }
    if (!roles.some((role) => user.roles.includes(role))) {
      sendForbidden(reply);
    }
  };
}

/** preHandler factory: exige un permiso (módulo + acción) concreto. */
export function requirePermission(module: ModuleKey, action: PermissionAction) {
  const required = permissionKey(module, action);
  return async function permissionGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.currentUser;
    if (!user) {
      sendUnauthorized(reply);
      return;
    }
    if (!user.permissions.includes(required)) {
      sendForbidden(reply);
    }
  };
}
