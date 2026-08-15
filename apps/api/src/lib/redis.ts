import { Redis } from 'ioredis';
import { env } from '../config/env';

/** Cliente Redis compartido: sesiones, rate-limit y (a futuro) pub/sub de WebSocket. */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
