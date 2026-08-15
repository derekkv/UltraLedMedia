import type { Prisma } from '@prisma/client';
import type { NotificationCreateInput } from '@ultraled/shared';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { registry } from '../../ws/registry';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

function toDto(n: NotificationRow): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Crea una notificación persistente y la emite en vivo por WebSocket. */
export async function createNotification(input: NotificationCreateInput): Promise<NotificationDto> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
    },
  });

  const dto = toDto(notification);
  registry.sendToUser(input.userId, { type: 'notification.new', payload: dto });
  return dto;
}

export async function listNotifications(params: {
  userId: string;
  cursor?: string;
  limit: number;
  unreadOnly?: boolean;
}): Promise<{ items: NotificationDto[]; nextCursor: string | null }> {
  const rows = await prisma.notification.findMany({
    where: { userId: params.userId, ...(params.unreadOnly ? { readAt: null } : {}) },
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;
  return { items: items.map(toDto), nextCursor };
}

/** Marca una notificación propia como leída (idempotente). */
export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<NotificationDto> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notificación no encontrada.');
  }
  const updated = existing.readAt
    ? existing
    : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return toDto(updated);
}
