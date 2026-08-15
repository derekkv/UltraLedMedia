import { buildApp } from './app';
import { env } from './config/env';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';

const app = await buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Recibido ${signal}, cerrando...`);
  try {
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
  } finally {
    process.exit(0);
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
