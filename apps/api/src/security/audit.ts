import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * ============================================================================
 *  SISTEMA DE AUDITORÍA / LOGS — LÉEME (IMPORTANTE PARA EL FUTURO)
 * ============================================================================
 *
 * ⚠️ REGLA DE ORO DEL PROYECTO:
 *   TODA acción que **cree, edite, elimine o cambie el estado** de un dato
 *   sensible DEBE registrar un log de auditoría con `audit(request, {...})`.
 *   Esto aplica a CUALQUIER módulo nuevo (venta, cobranza, gerencial, etc.).
 *   Si agregas una mutación y no la auditas, la tarea NO está completa.
 *   (Ver también `.kiro/steering/logging.md`.)
 *
 * Objetivo: poder reconstruir "quién hizo qué, cuándo y qué cambió" con detalle
 * suficiente para soporte, seguridad y trazabilidad.
 *
 * ----------------------------------------------------------------------------
 *  ESTRUCTURA DE CADA LOG (tabla `audit_logs`)
 * ----------------------------------------------------------------------------
 *  Columnas:
 *   - id          uuid
 *   - userId      uuid | null      → actor (FK a users; null si el actor se borró)
 *   - action      string           → verbo canónico "<ENTIDAD>_<VERBO>"
 *                                     p. ej. CLIENTE_CREATED, USER_UPDATED,
 *                                     CLIENTE_DELETED, CLIENTE_ESTADO_CHANGED
 *   - entity      string           → nombre lógico de la entidad: "cliente", "user"
 *   - entityId    string | null    → id del registro afectado
 *   - ip          string | null    → IP del actor (request.ip)
 *   - userAgent   string | null    → navegador/cliente
 *   - metadata    json             → detalle estructurado (ver abajo)
 *   - createdAt   timestamptz      → fecha y hora exactas
 *
 *  Forma de `metadata` (JSON) — SIEMPRE incluye `summary` y `actor`:
 *   {
 *     "summary":  string,                    // frase legible en español
 *     "actor":    { "id", "email", "fullName" },
 *     "changes"?: { [campo]: { "from": any, "to": any } },  // solo en ediciones
 *     "snapshot"?: { ...campos },             // solo en alta/borrado (sin secretos)
 *     ...extra                                // datos adicionales opcionales
 *   }
 *
 * ----------------------------------------------------------------------------
 *  EJEMPLOS
 * ----------------------------------------------------------------------------
 *  CREAR (snapshot completo, sin secretos):
 *   action: "CLIENTE_CREATED", entity: "cliente", entityId: "9f1c…"
 *   metadata: {
 *     summary: "Creó el cliente \"Café Central\" (RUC 1790012345001).",
 *     actor: { id, email: "admin@ultraled.media", fullName: "Administrador" },
 *     snapshot: { razonSocial: "Café Central", rucCedula: "1790012345001",
 *                 planContratado: "MENSUAL", valorPlan: 120.5, estado: "ACTIVO" }
 *   }
 *
 *  EDITAR (solo los campos que cambiaron):
 *   action: "CLIENTE_UPDATED", entity: "cliente", entityId: "9f1c…"
 *   metadata: {
 *     summary: "Editó el cliente \"Café Central\": valorPlan, diaPagoMensual.",
 *     actor: {…},
 *     changes: {
 *       valorPlan:      { from: 120.5, to: 150 },
 *       diaPagoMensual: { from: 5, to: 10 }
 *     }
 *   }
 *
 *  ELIMINAR (snapshot de lo borrado):
 *   action: "CLIENTE_DELETED", entity: "cliente", entityId: "9f1c…"
 *   metadata: {
 *     summary: "Eliminó el cliente \"Café Central\" (RUC 1790012345001).",
 *     actor: {…},
 *     snapshot: { …estado final antes de borrar… }
 *   }
 *
 *  CAMBIO DE ESTADO:
 *   action: "CLIENTE_ESTADO_CHANGED", entity: "cliente"
 *   metadata: { summary: "Pausó la publicidad de \"Café Central\".",
 *               actor: {…}, changes: { estado: { from: "ACTIVO", to: "PAUSADO" } } }
 *
 * ----------------------------------------------------------------------------
 *  CÓMO USAR (patrón en las rutas)
 * ----------------------------------------------------------------------------
 *   // CREATE
 *   const c = await createCliente(body, actorId);
 *   await audit(request, {
 *     action: 'CLIENTE_CREATED', entity: 'cliente', entityId: c.id,
 *     summary: `Creó el cliente "${c.razonSocial}".`,
 *     snapshot: auditSnapshot(c),
 *   });
 *
 *   // UPDATE (con diff)
 *   const before = await getCliente(id);
 *   const after  = await updateCliente(id, body, actorId);
 *   await audit(request, {
 *     action: 'CLIENTE_UPDATED', entity: 'cliente', entityId: id,
 *     summary: `Editó el cliente "${after.razonSocial}".`,
 *     changes: diffObjects(before, after),
 *   });
 *
 *   // DELETE
 *   const before = await getCliente(id);
 *   await deleteCliente(id);
 *   await audit(request, {
 *     action: 'CLIENTE_DELETED', entity: 'cliente', entityId: id,
 *     summary: `Eliminó el cliente "${before.razonSocial}".`,
 *     snapshot: auditSnapshot(before),
 *   });
 *
 *  Nota: `audit()` NUNCA lanza; si falla el registro, solo loguea el error para
 *  no romper el flujo de negocio.
 * ============================================================================
 */

/** Campos que jamás deben guardarse en un log. */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'csrfToken',
  'secret',
]);

export interface AuditChange {
  from: unknown;
  to: unknown;
}
export type AuditChanges = Record<string, AuditChange>;

export interface AuditInput {
  /** Verbo canónico "<ENTIDAD>_<VERBO>", p. ej. "USER_UPDATED". */
  action: string;
  /** Entidad lógica afectada, p. ej. "cliente" | "user". */
  entity: string;
  /** Id del registro afectado. */
  entityId?: string;
  /** Frase legible en español (obligatoria). */
  summary: string;
  /** Diff de campos (solo ediciones). */
  changes?: AuditChanges;
  /** Snapshot del registro (altas/borrados). Se sanea de campos sensibles. */
  snapshot?: Record<string, unknown>;
  /** Datos extra opcionales. */
  extra?: Record<string, unknown>;
  /** Override del actor; por defecto se toma de `request.currentUser`. */
  userId?: string | null;
}

/** Devuelve una copia del objeto sin campos sensibles. */
export function auditSnapshot<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Calcula el diff entre dos objetos (antes/después). Devuelve solo los campos
 * que cambiaron, ignorando campos sensibles y metadatos volátiles.
 * `fields` opcional limita la comparación a esas claves.
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[],
): AuditChanges {
  const ignore = new Set(['updatedAt', 'createdAt', 'version', ...SENSITIVE_KEYS]);
  const keys = fields ?? Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changes: AuditChanges = {};
  for (const key of keys) {
    if (ignore.has(key)) continue;
    if (!isEqual(before[key], after[key])) {
      changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
    }
  }
  return changes;
}

/**
 * Registra un evento de auditoría. Enriquecido con el actor (id/email/nombre),
 * IP y user-agent. Nunca lanza.
 */
export async function audit(request: FastifyRequest, input: AuditInput): Promise<void> {
  const actor = request.currentUser
    ? {
        id: request.currentUser.id,
        email: request.currentUser.email,
        fullName: request.currentUser.fullName,
      }
    : null;

  const metadata: Record<string, unknown> = {
    summary: input.summary,
    actor,
  };
  if (input.changes && Object.keys(input.changes).length > 0) metadata.changes = input.changes;
  if (input.snapshot) metadata.snapshot = auditSnapshot(input.snapshot);
  if (input.extra) Object.assign(metadata, input.extra);

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? request.currentUser?.id ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    request.log.error({ err, action: input.action }, 'No se pudo registrar el evento de auditoría');
  }
}
