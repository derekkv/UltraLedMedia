import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  REDIS_URL: z.string().min(1, 'REDIS_URL es requerida'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  SESSION_COOKIE_NAME: z.string().default('ultraled_sid'),
  SESSION_IDLE_TTL: z.coerce.number().int().positive().default(1800),
  SESSION_ABSOLUTE_TTL: z.coerce.number().int().positive().default(43200),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Solo usados por el seed; opcionales en runtime de la API.
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema> & { corsOrigins: string[] };

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    console.error(`Configuración de entorno inválida:\n${details}`);
    process.exit(1);
  }

  const data = parsed.data;
  return {
    ...data,
    corsOrigins: data.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export const env = loadEnv();
