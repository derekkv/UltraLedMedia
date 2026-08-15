import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export const notificationsQueryKey = ['notifications'] as const;

export const notificationsQueryOptions = queryOptions({
  queryKey: notificationsQueryKey,
  queryFn: () =>
    api.get<{ items: Notification[]; nextCursor: string | null }>('/notifications?limit=20'),
  staleTime: 15_000,
});

export function markNotificationRead(id: string): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/read`);
}
