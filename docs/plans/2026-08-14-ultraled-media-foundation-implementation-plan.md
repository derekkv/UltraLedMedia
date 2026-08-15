# Ultraled Media — Plan de Implementación de la Base (escalonado)

- **Fecha:** 2026-08-14
- **Diseño de referencia:** `docs/specs/2026-08-14-ultraled-media-foundation-design.md`
- **Objetivo:** Construir la BASE end-to-end (monorepo, infra, BD, seguridad/login, RBAC, WebSocket y shell de UI con sistema de diseño), dejando los 4 módulos de negocio como andamiaje vacío.
- **Método:** 8 fases secuenciales. Cada fase tiene **entregables** y un **checkpoint de verificación**. No se avanza a la fase siguiente hasta que el checkpoint pasa. Antes de empezar a codear cada fase, se confirma su alcance.

---

## Visión general de fases

| Fase | Nombre | Depende de | Resultado verificable |
|------|--------|-----------|-----------------------|
| 0 | Scaffolding del monorepo + infra local | — | `pnpm install` OK; `docker compose up` levanta Postgres + Redis |
| 1 | Base de datos: Prisma + migración + seed | 0 | Migración aplicada; seed crea roles, permisos y admin |
| 2 | Núcleo de API + plugins de seguridad | 0, 1 | `GET /api/v1/health` responde; headers de seguridad, CORS y CSRF activos |
| 3 | Autenticación + RBAC + usuarios | 2 | Login/logout/me funcionan; guards bloquean por rol/permiso; auditoría registra |
| 4 | Gateway WebSocket + notificaciones | 3 | WS autentica por cookie; emite `notification.new`; endpoints de notificaciones |
| 5 | Scaffolding frontend + sistema de diseño | 0 | App Vite corre; tokens neón aplicados; shell responsive; PWA instalable |
| 6 | Flujo de auth end-to-end (frontend) | 3, 5 | Login real desde la UI; rutas protegidas; nav por permisos; stubs de módulos |
| 7 | Tiempo real en UI + verificación integral | 4, 6 | Notificación en vivo llega a la UI; smoke test completo; README de arranque |

> Nota: la Fase 5 (frontend base) puede iniciarse en paralelo con las fases 2–4 (backend) porque solo depende de la 0. Para simplicidad se listan en orden, pero el shell de UI no necesita el backend hasta la Fase 6.

---

## Fase 0 — Scaffolding del monorepo + infra local

**Objetivo:** esqueleto del repo y servicios locales corriendo.

**Pasos:**
1. `git init` + `.gitignore` (node_modules, dist, .env, .turbo, coverage).
2. `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
3. `package.json` raíz con scripts orquestadores (dev/build/lint/typecheck) — Turborepo opcional.
4. `tsconfig.base.json` compartido; ESLint + Prettier en la raíz.
5. `packages/shared`: paquete TS vacío con export inicial (constantes de módulos/acciones y placeholder de esquemas Zod).
6. `docker-compose.yml`: servicios `postgres` y `redis` con volúmenes y puertos; `.env.example`.
7. Carpetas `apps/web` y `apps/api` con `package.json` mínimos.

**Entregables:** estructura del monorepo, docker-compose, configs base.

**Checkpoint:**
- `pnpm install` sin errores.
- `docker compose up -d` levanta Postgres y Redis; conexión verificada (`pg_isready`, `redis-cli ping`).

---

## Fase 1 — Base de datos: Prisma + migración + seed

**Objetivo:** esquema físico y datos semilla.

**Pasos:**
1. Instalar Prisma en `apps/api`; `datasource` PostgreSQL + `generator`.
2. Trasladar el borrador Prisma del spec (User, Role, Permission, UserRole, RolePermission, Notification, AuditLog + enums).
3. `prisma migrate dev` para la migración inicial.
4. Migración manual adicional: `CREATE UNIQUE INDEX ON "User" (LOWER(email));`.
5. `seed.ts`: crea permisos `(module, action)` de los 4 módulos, roles semilla (`ADMIN`, `GERENTE`, `VENDEDOR`, `COBRADOR`) con sus permisos, y el usuario `ADMIN` inicial (desde `ADMIN_EMAIL`/`ADMIN_PASSWORD`, hash Argon2id).
6. `lib/prisma.ts`: cliente singleton.

**Entregables:** `schema.prisma`, migraciones, `seed.ts`, cliente Prisma.

**Checkpoint:**
- Migración aplicada sin drift.
- `prisma db seed` crea roles/permisos y un admin; verificable con `prisma studio` o consulta.

---

## Fase 2 — Núcleo de API + plugins de seguridad

**Objetivo:** instancia Fastify segura y observable, sin lógica de negocio aún.

**Pasos:**
1. `config/env.ts`: validación de variables de entorno con Zod (falla al arrancar si falta algo).
2. `app.ts`: builder de Fastify + `server.ts` de arranque; logger.
3. `fastify-type-provider-zod`: validación/serialización de request/response.
4. Plugins de seguridad: `@fastify/helmet`, `@fastify/cors` (`credentials`, allowlist), `@fastify/rate-limit` (store Redis), `@fastify/cookie`, `@fastify/session` (**store Redis**), `@fastify/csrf-protection`.
5. `@fastify/swagger` + UI (OpenAPI en `/docs`).
6. `lib/redis.ts`: cliente Redis.
7. Manejador de errores global → **envelope** `{ error: { code, message, details? } }`.
8. Ruta `GET /api/v1/health` (liveness + chequeo Postgres/Redis) y endpoint para obtener token CSRF.

**Entregables:** API arrancable con todos los plugins de seguridad.

**Checkpoint:**
- `GET /api/v1/health` responde 200.
- Respuesta incluye headers de Helmet; CORS solo permite orígenes de la allowlist; sesión emite cookie; token CSRF disponible.

---

## Fase 3 — Autenticación + RBAC + usuarios

**Objetivo:** login stateful, control de acceso y gestión de usuarios por admin.

**Pasos:**
1. `security/hashing.ts`: Argon2id (hash + verify).
2. Esquemas Zod compartidos en `packages/shared` para auth y usuarios.
3. Rutas auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
   - Login: verifica credenciales, aplica **rate-limit estricto** y **bloqueo de cuenta** (`failed_login_attempts` / `locked_until`), crea sesión, respuesta genérica ante error.
   - `me`: resuelve usuario + roles + permisos + módulos habilitados.
4. `security/rbac.ts`: guards `requirePermission(module, action)` y `requireRole('ADMIN')`.
5. Módulo `users` (solo `ADMIN`): listar, crear, detalle, editar (activar/desactivar, asignar roles). Paginación por cursor.
6. `security/audit.ts`: registrar login (éxito/fallo), logout, creación/edición de usuarios y cambios de rol en `audit_logs`.

**Entregables:** flujo de auth completo en API + CRUD de usuarios + auditoría + guards RBAC.

**Checkpoint:**
- Login con admin del seed devuelve cookie de sesión; `me` devuelve permisos correctos.
- Ruta protegida responde 401 sin sesión y 403 sin permiso/rol.
- Tras N fallos, la cuenta se bloquea; los eventos quedan en `audit_logs`.

---

## Fase 4 — Gateway WebSocket + notificaciones

**Objetivo:** canal en tiempo real autenticado y base de notificaciones.

**Pasos:**
1. `@fastify/websocket`; ruta WS que **lee la cookie de sesión y carga la sesión desde Redis en el handshake** (rechaza si no hay sesión válida).
2. `ws/registry.ts`: registro en memoria de conexiones por `userId` y por módulo/rol.
3. Protocolo `{ type, payload }`; eventos `notification.new` (por usuario) y `dashboard.update` (por módulo/rol).
4. Heartbeat ping/pong + limpieza de conexiones muertas.
5. Módulo `notifications`: `GET /notifications` (cursor), `PATCH /notifications/:id/read`; al crear una notificación se emite `notification.new` al usuario conectado.
6. Punto de extensión documentado para migrar el registro a **Redis pub/sub** (multi-instancia) a futuro.

**Entregables:** gateway WS autenticado + API de notificaciones + emisión de eventos.

**Checkpoint:**
- Cliente con sesión válida se conecta; sin sesión es rechazado.
- Crear una notificación (vía seed/endpoint interno) entrega `notification.new` al socket del usuario.

---

## Fase 5 — Scaffolding frontend + sistema de diseño

**Objetivo:** app web base, tokens de diseño neón y shell responsive. (Solo depende de Fase 0.)

**Pasos:**
1. `apps/web`: Vite + React 19 + TS; Tailwind v4 (config CSS-first).
2. `styles/theme.css` con `@theme`: tokens del spec (navy base + superficies por lightness, cian/magenta como acentos, **rojo/rosa neón para error**, 4 niveles de texto, bordes de baja opacidad). Modo oscuro primario.
3. `shadcn` init (canary Tailwind v4) + integración de Origin UI (bloques) y Magic UI (animaciones).
4. Componentes base tokenizados (Button, Input, Card como panel de vidrio oscuro, glow del focal) siguiendo la firma visual "se enciende".
5. **Shell responsive:** sidebar en desktop / tab bar inferior en móvil; slots para navegación por módulos.
6. `vite-plugin-pwa`: manifest + service worker (instalable, cacheo de assets; sin sync offline).
7. TanStack Router (file-based) con `__root`, `login` y layout `_app`; TanStack Query provider; `lib/api.ts` (fetch con credenciales + CSRF + parseo de envelope), `lib/ws.ts` (cliente WS con reconexión).

**Entregables:** app web que corre, con sistema de diseño y shell.

**Checkpoint:**
- `pnpm --filter web dev` corre; el shell se ve correcto en desktop y móvil (revisión visual en ambos anchos).
- App instalable como PWA; tokens neón aplicados y legibles (chequeo de contraste del punto de diseño).

---

## Fase 6 — Flujo de auth end-to-end (frontend)

**Objetivo:** login real desde la UI y navegación controlada por permisos.

**Pasos:**
1. Página `login` con React Hook Form + Zod (esquema compartido); manejo de errores del envelope.
2. Query `me` + contexto de auth; `beforeLoad` del router protege `_app` y redirige a `/login`.
3. Logout; manejo de expiración de sesión (401 → redirige a login).
4. Navegación del shell **filtrada por permisos** de `me` (muestra solo módulos habilitados).
5. Stubs de rutas de módulos: `venta`, `cobranza`, `gerencial`, `clientes` — cada uno una página vacía con placeholder.
6. Pantalla de administración de usuarios (solo `ADMIN`): listar/crear/editar/roles.

**Entregables:** autenticación completa en la UI + navegación por permisos + módulos vacíos navegables.

**Checkpoint:**
- Login/logout reales contra la API; refresco de página mantiene sesión.
- Usuario sin permiso de un módulo no ve ni accede a su ruta; admin ve la gestión de usuarios.

---

## Fase 7 — Tiempo real en UI + verificación integral

**Objetivo:** cerrar el lazo realtime y validar la base completa.

**Pasos:**
1. `lib/ws.ts` conectado tras login; suscripción a `notification.new` y `dashboard.update`.
2. UI de notificaciones (campana + lista) que se actualiza en vivo; los eventos **invalidan la caché de TanStack Query** correspondiente.
3. Reconexión con backoff y re-suscripción al recuperar conexión.
4. Smoke test end-to-end: login → sesión persistente → acceso por permiso → WS conecta → llega notificación en vivo → logout.
5. `README.md` con instrucciones de arranque (docker compose, migrate, seed, dev de api y web, credenciales admin).

**Entregables:** notificaciones en vivo en la UI + documentación de arranque.

**Checkpoint:**
- Crear una notificación en el backend aparece en la UI sin recargar.
- Smoke test completo pasa de principio a fin.

---

## Riesgos y decisiones a vigilar

- **Sesión en WebSocket:** hay que parsear la cookie y cargar la sesión manualmente en el upgrade (no se hidrata sola). Validar temprano en Fase 4.
- **CSRF + fetch:** el cliente web debe adjuntar el token CSRF en mutaciones; probar el ciclo completo en Fase 6.
- **Contraste del neón:** verificar legibilidad (evitar `#00ffff`/`#ff00ff` puros en texto/áreas grandes) en Fase 5.
- **BigInt vs UUID:** se eligió UUID; confirmar que Prisma genera `gen_random_uuid()`/uuid en la migración.
- **Escalado WS:** el registro en memoria funciona en instancia única; dejar el punto de extensión a Redis pub/sub documentado (Fase 4).

## Fuera de alcance (se aborda después, módulo por módulo)

- Lógica de negocio de Venta, Cobranza, Gerencial y Clientes.
- 2FA, recuperación de contraseña, push nativo, Capacitor, sync offline.

## Orden sugerido de arranque

**Fase 0 → 1 → 2 → 3 → 4**, y en paralelo **Fase 5**; luego **6 → 7**. Empezamos por la **Fase 0** cuando des el OK.
