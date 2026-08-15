import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationRead,
  notificationsQueryKey,
  notificationsQueryOptions,
} from '@/lib/notifications';
import { realtime, type WsMessage } from '@/lib/ws';
import { cn } from '@/lib/utils';

/**
 * Campana de notificaciones con panel. Conecta el WebSocket al montar,
 * invalida la caché de TanStack Query ante eventos en vivo y se desconecta al desmontar.
 */
export function Notifications(): React.ReactElement {
  const queryClient = useQueryClient();
  const { data } = useQuery(notificationsQueryOptions);

  React.useEffect(() => {
    realtime.connect();
    const off = realtime.on((message: WsMessage) => {
      if (message.type === 'notification.new') {
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      }
      if (message.type === 'dashboard.update') {
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    });
    return () => {
      off();
      realtime.disconnect();
    };
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-9 place-items-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground shadow-[0_0_8px_2px_var(--accent)]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-lg border border-border bg-popover text-foreground shadow-xl"
        >
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Notificaciones
          </div>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'cursor-pointer px-4 py-3 transition-colors hover:bg-surface-1',
                  !n.readAt && 'bg-surface-1/60',
                )}
                onClick={() => !n.readAt && markRead.mutate(n.id)}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_1px_var(--primary)]" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
