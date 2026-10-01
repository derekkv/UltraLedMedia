import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { env } from './config/env';
import { redis } from './lib/redis';
import { RedisSessionStore } from './session/redis-store';
import { registerErrorHandler } from './lib/error-handler';
import { healthRoutes } from './modules/health/routes';
import { securityRoutes } from './modules/security/routes';
import { authRoutes } from './modules/auth/routes';
import { usersRoutes } from './modules/users/routes';
import { clientesRoutes } from './modules/clientes/routes';
import { auditRoutes } from './modules/audit/routes';
import { notificationsRoutes } from './modules/notifications/routes';
import { wsGateway } from './ws/gateway';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } }
        : true,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Validación/serialización con Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Seguridad
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, { origin: env.corsOrigins, credentials: true });
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
  });

  // Sesión stateful por cookie (store en Redis)
  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_COOKIE_NAME,
    store: new RedisSessionStore(redis, 'sess:', env.SESSION_ABSOLUTE_TTL),
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: env.SESSION_IDLE_TTL * 1000,
    },
  });

  // CSRF (double-submit ligado a la sesión)
  await app.register(fastifyCsrf, { sessionPlugin: '@fastify/session' });

  // Documentación OpenAPI
  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'Ultraled Media API', version: '0.1.0' },
      tags: [
        { name: 'health', description: 'Estado del servicio' },
        { name: 'security', description: 'CSRF y utilidades de seguridad' },
        { name: 'auth', description: 'Autenticación (login, logout, sesión)' },
        { name: 'users', description: 'Gestión de usuarios (solo ADMIN)' },
        { name: 'clientes', description: 'Clientes y contratos de publicidad (módulo Venta)' },
        { name: 'audit', description: 'Registros de auditoría (actividad del sistema)' },
        { name: 'notifications', description: 'Notificaciones y tiempo real' },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });

  registerErrorHandler(app);

  // WebSocket (tiempo real)
  await app.register(fastifyWebsocket);

  // Subida de archivos (multipart) para adjuntos de clientes.
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_BYTES,
      files: 10,
    },
  });

  // Rutas versionadas
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(securityRoutes);
      await api.register(authRoutes);
      await api.register(usersRoutes);
      await api.register(clientesRoutes);
      await api.register(auditRoutes);
      await api.register(notificationsRoutes);
      await api.register(wsGateway);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
