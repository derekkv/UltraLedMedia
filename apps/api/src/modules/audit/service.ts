import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface AuditActor {
  id: string;
  email: string;
  fullName: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AuditActor | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  snapshot: Record<string, unknown> | null;
}

type Row = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; email: true; fullName: true } } };
}>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toDto(row: Row): AuditLogDto {
  const meta = asRecord(row.metadata);
  const metaActor = asRecord(meta.actor);
  const actor: AuditActor | null = row.user
    ? { id: row.user.id, email: row.user.email, fullName: row.user.fullName }
    : typeof metaActor.id === 'string'
      ? {
          id: String(metaActor.id),
          email: String(metaActor.email ?? ''),
          fullName: String(metaActor.fullName ?? ''),
        }
      : null;

  return {
    id: row.id,
    action: row.action,
    entity: row.entity ?? null,
    entityId: row.entityId ?? null,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt.toISOString(),
    actor,
    summary: typeof meta.summary === 'string' ? meta.summary : row.action,
    changes:
      meta.changes && typeof meta.changes === 'object'
        ? (meta.changes as Record<string, { from: unknown; to: unknown }>)
        : null,
    snapshot: meta.snapshot ? asRecord(meta.snapshot) : null,
  };
}

export async function listAuditLogs(params: {
  cursor?: string;
  limit: number;
  entity?: string;
  action?: string;
  q?: string;
}): Promise<{ items: AuditLogDto[]; nextCursor: string | null }> {
  const q = params.q?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { entityId: { contains: q, mode: 'insensitive' } },
            { user: { fullName: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;
  return { items: items.map(toDto), nextCursor };
}
