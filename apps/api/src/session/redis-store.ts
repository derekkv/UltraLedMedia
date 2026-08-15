import type { Redis } from 'ioredis';
import type { SessionStore } from '@fastify/session';
import type { Session } from 'fastify';

type ErrorCallback = (err?: unknown) => void;
type GetCallback = (err: unknown, session?: Session | null) => void;

/**
 * Store de sesión stateful sobre Redis para @fastify/session.
 * Implementa el contrato mínimo (get/set/destroy) sin acoplar express-session.
 * El TTL de la clave se renueva en cada `set` (sesión rolling).
 */
export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = 'sess:',
    private readonly ttlSeconds = 43200,
  ) {}

  private key(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  set(sessionId: string, session: Session, callback: ErrorCallback): void {
    this.redis
      .set(this.key(sessionId), JSON.stringify(session), 'EX', this.ttlSeconds)
      .then(() => callback())
      .catch((err: unknown) => callback(err));
  }

  get(sessionId: string, callback: GetCallback): void {
    this.redis
      .get(this.key(sessionId))
      .then((data) => callback(null, data ? (JSON.parse(data) as Session) : null))
      .catch((err: unknown) => callback(err));
  }

  destroy(sessionId: string, callback: ErrorCallback): void {
    this.redis
      .del(this.key(sessionId))
      .then(() => callback())
      .catch((err: unknown) => callback(err));
  }
}
