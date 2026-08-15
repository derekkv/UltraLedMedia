# Ultraled Media

Aplicación de operaciones internas (PWA mobile-first). Monorepo con backend Fastify + PostgreSQL y frontend Vite + React.

- Diseño y decisiones: `docs/specs/2026-08-14-ultraled-media-foundation-design.md`
- Plan de implementación: `docs/plans/2026-08-14-ultraled-media-foundation-implementation-plan.md`

## Stack

- **Frontend** (`apps/web`): Vite, React 19, TypeScript, Tailwind v4, TanStack Router/Query, React Hook Form + Zod, PWA.
- **Backend** (`apps/api`): Node.js, Fastify 5, Prisma, PostgreSQL, sesión stateful por cookie (store en Redis), WebSocket.
- **Compartido** (`packages/shared`): esquemas Zod y tipos.
- **Infra**: Docker Compose (PostgreSQL + Redis).

## Requisitos

- Node.js >= 22
- pnpm 11
- Docker + Docker Compose

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Infraestructura (PostgreSQL + Redis)
docker compose up -d

# 3. Dependencias
pnpm install

# 4. Base de datos: migraciones + datos semilla (roles, permisos, admin)
pnpm --filter @ultraled/api db:migrate
pnpm --filter @ultraled/api db:seed

# 5. Backend (http://localhost:3000, docs en /docs)
pnpm --filter @ultraled/api dev

# 6. Frontend (http://localhost:5173)
pnpm --filter @ultraled/web dev
```

### Usuario administrador inicial

Definido en `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Por defecto:

- Email: `admin@ultraled.media`
- Password: `CambiarEsteAdmin123!`

> Cambia estas credenciales antes de cualquier despliegue.

## Scripts útiles

Desde la raíz:

- `pnpm infra:up` / `pnpm infra:down` — levantar/bajar Postgres + Redis
- `pnpm --filter @ultraled/api db:studio` — Prisma Studio
- `pnpm --filter @ultraled/api db:reset` — reiniciar la base (migraciones + seed)
- `pnpm typecheck` — typecheck de todos los paquetes
- `pnpm --filter @ultraled/web build` — build de producción del frontend

## Estructura

```
apps/
  api/    # Fastify + Prisma (auth, RBAC, usuarios, notificaciones, WebSocket)
  web/    # PWA React (login, shell responsive, módulos)
packages/
  shared/ # Zod + tipos compartidos
docs/     # spec de diseño y plan de implementación
```

## Estado

Base completa: autenticación con sesión de servidor, RBAC, gestión de usuarios, auditoría,
WebSocket con notificaciones en vivo, y shell de UI con sistema de diseño. Los 4 módulos de
negocio (Venta, Cobranza, Gerencial, Clientes) están como andamiaje vacío, listos para
implementarse uno por uno.

## Seguridad

- Sesión stateful httpOnly + SameSite=Lax, con expiración rolling y absoluta.
- Protección CSRF (double-submit) en mutaciones; CORS con allowlist; Helmet; rate-limit
  (más estricto en login); hashing Argon2id; bloqueo de cuenta por intentos fallidos.
- Autorización por permisos `(módulo, acción)` y rol; auditoría de eventos sensibles.
