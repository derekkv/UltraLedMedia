import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationRead,
  notificationsQueryKey,
  notificationsQueryOptions,
} from '@/lib/notifications';
import { realtime, type WsMessage } from '@/lib/ws';
import { toast } from '@/components/toaster';
import { transitionFast } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function Notifications(): React.ReactElement {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const { data } = useQuery(notificationsQueryOptions);

  React.useEffect(() => {
    realtime.connect();
    const off = realtime.on((message: WsMessage) => {
      if (message.type === 'notification.new') {
        const payload = message.payload as { title?: string } | undefined;
        if (payload?.title) toast(payload.title);
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-9 place-items-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount align="end" sideOffset={8}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={transitionFast}
                style={{ transformOrigin: 'top right' }}
                className="z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover text-foreground elevated-2"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold">Notificaciones</span>
                  {unread > 0 && (
                    <span className="text-xs text-muted-foreground">{unread} sin leer</span>
                  )}
                </div>
                <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                  {items.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Sin notificaciones.
                    </li>
                  )}
                  {items.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => !n.readAt && markRead.mutate(n.id)}
                      className={cn(
                        'cursor-pointer px-4 py-3 transition-colors hover:bg-surface-2',
                        !n.readAt && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            n.readAt ? 'bg-transparent' : 'bg-primary',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
