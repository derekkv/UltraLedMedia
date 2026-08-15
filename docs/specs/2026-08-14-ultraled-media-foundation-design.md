# Ultraled Media — Diseño de la Base (Foundation)

- **Fecha:** 2026-08-14
- **Estado:** Diseño aprobado (pendiente revisión final del documento)
- **Alcance de este documento:** Solo la BASE de la aplicación: arquitectura, seguridad, autenticación (login), RBAC, esquema de base de datos, contrato de API, WebSocket y sistema de diseño. Los 4 módulos de negocio (Venta, Cobranza, Gerencial, Clientes) quedan como **andamiaje vacío**; su lógica interna se diseñará después, uno por uno.

---

## 1. Objetivo y contexto

Aplicación de operaciones internas para **Ultraled Media** (empresa del rubro LED / media / señalización digital). No hay registro público: **los usuarios los crea la gerencia**. La app es **mobile-first responsive** (PC y móvil) entregada como **PWA**, dejando abierta la opción de empaquetar con **Capacitor** en el futuro sin reescribir.

Módulos previstos (por ahora vacíos): **Venta, Cobranza, Gerencial, Clientes.**

### Decisiones cerradas con el cliente

| Tema | Decisión |
|------|----------|
| Plataforma | PWA mobile-first, responsive PC + móvil. Capacitor a futuro. |
| Acceso a módulos | Un usuario puede ver **varios** módulos. |
| Autenticación | **Cookie de servidor (sesión stateful)**. Sin 2FA por ahora. |
| Tiempo real | Notificaciones + actualización en vivo de dashboards gerenciales. A futuro: más eventos y datos en tiempo real. |
| Offline | **No** se requiere. |
| Color error | Se **separa** del magenta: magenta = marca/CTA/notificaciones; rojo/rosa neón = error. |
| Neón puro | `#00ffff` / `#ff00ff` solo en acentos, trazos y glows; variantes desaturadas/aclaradas para texto y fondos. |

---

## 2. Stack tecnológico

**Frontend (`apps/web`)**
- Vite + React 19 + TypeScript
- Tailwind CSS v4 (config CSS-first con `@theme`)
- shadcn/ui (CLI compatible con Tailwind v4 + React 19) + Origin UI (bloques con convención shadcn) + Magic UI (animaciones)
- TanStack Router (file-based, con guards de auth)
- TanStack Query (estado de servidor; integrado con loaders del router)
- React Hook Form + Zod
- `vite-plugin-pwa` (instalable; cacheo de assets, **sin sync offline de datos**)

**Backend (`apps/api`)**
- Node.js + Fastify 5 + TypeScript
- Prisma + PostgreSQL
- `@fastify/session` + `@fastify/cookie` (sesión stateful, store en Redis)
- `@fastify/websocket`
- `fastify-type-provider-zod` (validación de request/response con Zod)
- `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/csrf-protection`
- `@fastify/swagger` + UI (OpenAPI autogenerado)
- Argon2id para hashing de contraseñas

**Infra local**
- `docker-compose`: PostgreSQL + Redis

**Compartido (`packages/shared`)**
- Esquemas Zod y tipos TypeScript compartidos entre front y back (fuente única de contratos y validación).

---

## 3. Arquitectura del repositorio (monorepo, pnpm workspaces)

```
ultraled-media/
├─ apps/
│  ├─ web/                 # PWA (Vite + React + TS)
│  │  ├─ src/
│  │  │  ├─ routes/        # file-based routing (TanStack Router)
│  │  │  │  ├─ __root.tsx
│  │  │  │  ├─ login.tsx
│  │  │  │  └─ _app/       # layout autenticado + módulos
│  │  │  │     ├─ venta/       (vacío)
│  │  │  │     ├─ cobranza/    (vacío)
│  │  │  │     ├─ gerencial/   (vacío)
│  │  │  │     └─ clientes/    (vacío)
│  │  │  ├─ components/    # UI (shadcn/origin/magic) + shell responsive
│  │  │  ├─ lib/           # api client, query client, ws client, auth
│  │  │  └─ styles/        # tokens Tailwind v4 (@theme)
│  │  └─ vite.config.ts
│  └─ api/                 # Fastify + Prisma
│     ├─ src/
│     │  ├─ app.ts         # build de la instancia Fastify + plugins
│     │  ├─ server.ts      # arranque
│     │  ├─ config/        # validación de env con Zod
│     │  ├─ plugins/       # cookie, session, cors, helmet, rate-limit, csrf, swagger, ws
│     │  ├─ modules/
│     │  │  ├─ auth/       # login, logout, me
│     │  │  ├─ users/      # gestión de usuarios y roles (admin)
│     │  │  ├─ notifications/
│     │  │  ├─ venta/      (stub vacío)
│     │  │  ├─ cobranza/   (stub vacío)
│     │  │  ├─ gerencial/  (stub vacío)
│     │  │  └─ clientes/   (stub vacío)
│     │  ├─ ws/            # gateway WebSocket + registro de suscripciones
│     │  ├─ security/      # rbac guards, hashing, audit
│     │  └─ lib/           # prisma client, redis client
│     └─ prisma/
│        ├─ schema.prisma
│        └─ seed.ts
├─ packages/
│  └─ shared/              # zod schemas + tipos + constantes (módulos, acciones)
├─ docker-compose.yml      # postgres + redis
├─ docs/specs/
└─ pnpm-workspace.yaml
```

**Por qué monorepo:** contrato único compartido (Zod/tipos) entre front y back, sin duplicación. Se descarta multi-repo por perder esa ventaja.

**Por qué Redis para sesión:** un único servicio que sirve para (1) store de sesión, (2) *backplane* pub/sub para escalar WebSocket horizontalmente a futuro, (3) store de rate-limit. Alternativa (tabla `sessions` en Postgres) descartada: menos infra ahora, pero se termina necesitando Redis igual al crecer el realtime.

---

## 4. Seguridad

### 4.1 Autenticación (sesión stateful por cookie)

- **Login:** `POST /api/v1/auth/login` con `{ email, password }`. Verifica hash **Argon2id**. Si es válido, crea sesión en Redis y setea cookie de sesión.
- **Cookie:** `httpOnly`, `Secure` (en producción), `SameSite=Lax`, `Path=/`. Expiración **rolling** (idle timeout, p. ej. 30 min) + **timeout absoluto** (p. ej. 12 h).
- **Sesión:** guarda `userId` y metadatos mínimos; permisos se resuelven server-side por request (no se confía en datos del cliente).
- **Logout:** `POST /api/v1/auth/logout` destruye la sesión en el store y limpia la cookie.
- **`GET /api/v1/auth/me`:** devuelve usuario actual + roles + permisos + módulos habilitados.
- Sin registro público. Sin 2FA por ahora (queda el hueco para agregarlo como paso post-login).

### 4.2 Protección de fuerza bruta / abuso

- **Bloqueo de cuenta:** `failed_login_attempts` + `locked_until` en `users`. Tras N intentos fallidos (p. ej. 5) se bloquea temporalmente.
- **Rate limit:** `@fastify/rate-limit` global + regla **más estricta en `/auth/login`**.
- Respuestas de login **genéricas** (no revelar si el email existe).

### 4.3 Defensa de la API

- **CSRF:** `@fastify/csrf-protection` (double-submit token) en todas las mutaciones — obligatorio por usar cookies.
- **CORS:** `credentials: true` + allowlist de orígenes (dev y prod).
- **Helmet:** headers de seguridad.
- **Validación de entrada:** Zod en cada ruta (`fastify-type-provider-zod`), esquemas desde `packages/shared`.
- **Validación de env:** al arrancar, con Zod; falla temprano si falta un secreto o URL.
- **Secretos:** solo por variables de entorno; nunca en el repo.

### 4.4 Auditoría

- Tabla `audit_logs` para eventos sensibles: login (éxito/fallo), logout, creación/edición de usuarios, cambios de roles/permisos. Guarda `user_id`, `action`, `entity`, `entity_id`, `ip`, `user_agent`, `metadata` (jsonb), `created_at`.

---

## 5. RBAC (control de acceso basado en roles)

Un usuario puede tener **varios roles**; la **unión de permisos** define qué módulos ve.

- **Módulos (enum):** `VENTA`, `COBRANZA`, `GERENCIAL`, `CLIENTES`.
- **Acciones (enum):** `READ`, `CREATE`, `UPDATE`, `DELETE`, `MANAGE`.
- **Permiso** = `(module, action)`, con `key` único legible (p. ej. `venta:read`).
- **Roles semilla:**
  - `ADMIN` — gerencia; crea usuarios, asigna roles; `MANAGE` en todos los módulos.
  - `GERENTE` — acceso de lectura/gestión al módulo Gerencial y lectura transversal.
  - `VENDEDOR` — módulo Venta (y lectura de Clientes).
  - `COBRADOR` — módulo Cobranza (y lectura de Clientes).

**Aplicación:**
- Backend: `preHandler` guard que exige permisos por ruta (p. ej. `requirePermission('venta', 'read')`). Los permisos se leen del usuario de la sesión en cada request. La administración de usuarios/roles usa un guard aparte `requireRole('ADMIN')` (no es un módulo de negocio).
- Frontend: `/auth/me` devuelve los permisos; la navegación **muestra solo los módulos habilitados** y las rutas protegidas se bloquean en `beforeLoad`.

---

## 6. Esquema de base de datos (base)

IDs en **UUID** (opacos, evitan enumeración en URLs de cliente). Timestamps `timestamptz`. Índices explícitos en todas las FK. Los módulos de negocio quedan vacíos.

### 6.1 Borrador Prisma

```prisma
// datasource / generator omitidos por brevedad (PostgreSQL)

enum ModuleKey {
  VENTA
  COBRANZA
  GERENCIAL
  CLIENTES
}

enum PermissionAction {
  READ
  CREATE
  UPDATE
  DELETE
  MANAGE
}

model User {
  id                   String    @id @default(uuid()) @db.Uuid
  email                String    @unique
  passwordHash         String
  fullName             String
  phone                String?
  isActive             Boolean   @default(true)
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime? @db.Timestamptz(6)
  lastLoginAt          DateTime? @db.Timestamptz(6)
  createdAt            DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime  @updatedAt @db.Timestamptz(6)

  roles                UserRole[]
  notifications        Notification[]
  auditLogs            AuditLog[]

  @@index([email])
}

model Role {
  id           String   @id @default(uuid()) @db.Uuid
  key          String   @unique          // ADMIN, GERENTE, VENDEDOR, COBRADOR
  name         String
  description  String?
  isSystem     Boolean  @default(false)
  createdAt    DateTime @default(now()) @db.Timestamptz(6)

  users        UserRole[]
  permissions  RolePermission[]
}

model Permission {
  id        String           @id @default(uuid()) @db.Uuid
  module    ModuleKey
  action    PermissionAction
  key       String           @unique     // p.ej. "venta:read"
  roles     RolePermission[]

  @@unique([module, action])
}

model UserRole {
  userId String @db.Uuid
  roleId String @db.Uuid
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
}

model RolePermission {
  roleId       String     @db.Uuid
  permissionId String     @db.Uuid
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId])
}

model Notification {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  type      String
  title     String
  body      String
  data      Json      @default("{}")
  readAt    DateTime? @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([createdAt])
}

model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @db.Uuid
  action    String
  entity    String?
  entityId  String?
  ip        String?
  userAgent String?
  metadata  Json     @default("{}")
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
}
```

> Notas de implementación PostgreSQL:
> - Índice case-insensitive de email: agregar migración manual `CREATE UNIQUE INDEX ON "User" (LOWER(email));` (Prisma no lo expresa nativamente).
> - Las **sesiones viven en Redis**, no en tabla.
> - Tablas de los 4 módulos: **no se crean todavía** (andamiaje vacío).

### 6.2 Seed inicial

- Crea permisos para cada `(module, action)`.
- Crea roles semilla y asigna permisos.
- Crea **un usuario ADMIN inicial** (credenciales por variables de entorno; forzar cambio de contraseña a futuro).

---

## 7. Contrato de API (REST v1)

- Base: `/api/v1`. Recursos en plural. Documentación **OpenAPI** autogenerada.
- **Envelope de error:** `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- **Paginación** por cursor en listados.
- Códigos HTTP correctos (2xx / 4xx / 5xx).

### Rutas base

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| POST | `/api/v1/auth/login` | Iniciar sesión | público |
| POST | `/api/v1/auth/logout` | Cerrar sesión | autenticado |
| GET | `/api/v1/auth/me` | Usuario actual + permisos | autenticado |
| GET | `/api/v1/users` | Listar usuarios | rol `ADMIN` |
| POST | `/api/v1/users` | Crear usuario | rol `ADMIN` |
| GET | `/api/v1/users/:id` | Detalle | rol `ADMIN` |
| PATCH | `/api/v1/users/:id` | Editar / activar / roles | rol `ADMIN` |

> La gestión de usuarios y roles **no** es un módulo de negocio, por lo que se protege por **rol `ADMIN`** (guard `requireRole('ADMIN')`), no por un permiso `(module, action)`. Los permisos `(module, action)` aplican solo a los 4 módulos de negocio.
| GET | `/api/v1/notifications` | Listar notificaciones propias | autenticado |
| PATCH | `/api/v1/notifications/:id/read` | Marcar leída | autenticado |
| — | `/api/v1/ventas` `/cobranzas` `/gerencial` `/clientes` | **Stubs vacíos** | por permiso de módulo |

---

## 8. WebSocket (tiempo real)

- Plugin `@fastify/websocket`.
- **Autenticación en el handshake:** se lee y valida la **cookie de sesión** durante el upgrade y se carga la sesión desde Redis manualmente (la sesión no se hidrata sola en conexiones WS — trampa conocida de Fastify).
- **Protocolo:** mensajes JSON `{ "type": string, "payload": unknown }`.
- **Suscripciones:**
  - Por **usuario** → notificaciones: evento `notification.new`.
  - Por **módulo/rol** → dashboards gerenciales en vivo: evento `dashboard.update`.
- **Fiabilidad:** heartbeat ping/pong + reconexión con backoff en el cliente.
- **Integración con datos:** los eventos disparan **invalidación de caché de TanStack Query** para refrescar vistas.
- **Escalado:** ahora, registro de suscripciones **en memoria** (instancia única). Futuro: **Redis pub/sub** como backplane para múltiples instancias y para soportar "varios eventos y datos en tiempo real".

---

## 9. Frontend y sistema de diseño

### 9.1 Arquitectura de la app

- **Routing:** TanStack Router file-based. `beforeLoad` valida sesión vía `/auth/me`; redirige a `/login` si no hay sesión.
- **Estado de servidor:** TanStack Query (integrado con loaders del router). Cliente API con `fetch` + credenciales, manejo de token CSRF, y del envelope de error.
- **Formularios:** React Hook Form + Zod (esquemas de `packages/shared`).
- **UI:** shadcn/ui como base, Origin UI para bloques, Magic UI para animaciones puntuales.
- **PWA:** `vite-plugin-pwa` (manifest, instalable, cacheo de assets). Sin sincronización offline de datos.
- **Shell responsive (mobile-first):** **sidebar en desktop / tab bar inferior en móvil**, mostrando **solo los módulos permitidos**.

### 9.2 Dirección visual — mundo Ultraled (LED / neón)

- **Dominio:** paneles LED, luminosidad, brillo de neón, píxel encendido, sala de control a oscuras, vidrio negro de pantalla apagada, señal/espectro.
- **Firma visual:** los elementos **focales/activos "se encienden"** con un *glow* cian tipo LED; las cards son paneles de vidrio oscuro. Acento usado con avaricia (~10% de la pantalla).
- **Modo oscuro primario e inmersivo.**

### 9.3 Tokens de color

| Token | Uso | Valor base |
|-------|-----|-----------|
| Fondo (base) | Canvas / superficie 0 | Navy profundo `#001a30` |
| Superficies | Elevación por *lightness* sobre el navy (no otros hues) | navy +7/+9/+12% |
| Bordes | Baja opacidad (blanco/cian) | `rgba(255,255,255,0.06–0.12)` |
| Acento primario (cian) | Estados activos, foco, glow, trazos | `#00ffff` **solo acento/trazo/glow** |
| Acento de marca (magenta) | CTA, notificaciones, identidad | `#ff00ff` **solo acento** |
| Error | Estados de error (separado del magenta) | rojo/rosa neón distinto |
| Texto | 4 niveles (primario/secundario/terciario/muted) | variantes claras sobre navy |

**Reglas de color:**
1. **Error separado del magenta.** Magenta = marca/CTA/notificaciones; error = rojo/rosa neón propio. Un CTA y un error no deben verse iguales.
2. **Neón puro (`#00ffff`/`#ff00ff`) nunca en áreas grandes ni en texto de párrafo** (vibra, cansa la vista, falla contraste). Para texto/fondos, variantes **desaturadas/aclaradas**; el neón puro se reserva a acentos, trazos y glows.
3. **Distribución ~60/30/10:** navy domina, tono secundario, ~10% acento.
4. **Profundidad:** en dark se apoya en **bordes** de baja opacidad + *glow* selectivo en focales (no drop-shadows dramáticos).
5. **Un solo hue por superficie:** variar solo *lightness*, no introducir hues distintos por panel.

---

## 10. Variables de entorno (borrador)

**API**
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`
- `SESSION_SECRET` (clave de firma de sesión)
- `SESSION_COOKIE_NAME`, `SESSION_IDLE_TTL`, `SESSION_ABSOLUTE_TTL`
- `CORS_ORIGINS` (allowlist)
- `NODE_ENV`, `PORT`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed inicial)

**Web**
- `VITE_API_URL`

Todas validadas con Zod al arranque.

---

## 11. Fuera de alcance (por ahora)

- Lógica interna de los módulos Venta, Cobranza, Gerencial, Clientes (se diseñarán uno por uno).
- 2FA, recuperación de contraseña por email, notificaciones push nativas.
- Empaquetado Capacitor (arquitectura lo permite, pero no se implementa ahora).
- Sincronización offline.

---

## 12. Próximo paso

Con este diseño aprobado, el siguiente entregable es el **plan de implementación** de la base (scaffolding del monorepo, docker-compose, Prisma + migración inicial + seed, plugins de seguridad de Fastify, flujo de login end-to-end, gateway WebSocket, y shell de UI con sistema de diseño). Luego se abordará **cada módulo por separado**, con su propio ciclo de diseño → plan → implementación.
