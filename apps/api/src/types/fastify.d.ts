import 'fastify';
import type { CurrentUser } from '../security/access';

declare module 'fastify' {
  /** Datos persistidos en la sesión del servidor. */
  interface Session {
    userId?: string;
  }

  /** Usuario autenticado adjuntado por el guard requireAuth. */
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}
