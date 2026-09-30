import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationRead,
  notificationsQueryKey,
  notificationsQueryOptions,
  type Notification,
} from '@/lib/notifications';
import { realtime, type WsMessage } from '@/lib/ws';
import { toast } from '@/components/toaster';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/format';
import { staggerContainer, staggerItem } from '@/lib/motion';
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

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = items.filter((n) => !n.readAt).map((n) => n.id);
      await Promise.all(ids.map((id) => markNotificationRead(id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  return (
    <>
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={() => setOpen(true)}
        className="relative grid size-9 place-items-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Modal open={open} onOpenChange={setOpen} className="max-w-md overflow-hidden p-0">
        <div className="flex max-h-[80vh] flex-col">
          {/* Encabezado */}
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <div>
              <ModalTitle className="text-base font-semibold text-foreground">
                Notificaciones
              </ModalTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
              </p>
            </div>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck /> Marcar todas
              </Button>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted-foreground">
                  <BellOff className="size-5" />
                </div>
                <p className="text-sm text-muted-foreground">No tienes notificaciones.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <motion.ul
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-1"
                >
                  {items.map((n: Notification) => (
                    <motion.li key={n.id} variants={staggerItem}>
                      <button
                        type="button"
                        onClick={() => !n.readAt && markRead.mutate(n.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-2',
                          !n.readAt && 'bg-secondary/[0.06]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            n.readAt ? 'bg-transparent' : 'bg-secondary',
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-sm',
                                n.readAt ? 'font-medium text-foreground-secondary' : 'font-semibold',
                              )}
                            >
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </AnimatePresence>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
