import * as React from 'react';
import {
  createFileRoute,
  redirect,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { meQueryOptions, logout } from '@/lib/auth';
import { ApiException } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { realtime } from '@/lib/ws';
import { useConfirm } from '@/providers/confirm';
import { fadeRise, transitionFast } from '@/lib/motion';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (err) {
      if (err instanceof ApiException) {
        throw redirect({ to: '/login', search: { redirect: location.href } });
      }
      throw err;
    }
  },
  component: AppLayout,
});

function AnimatedOutlet(): React.ReactElement {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={fadeRise}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: -6, transition: transitionFast }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function AppLayout(): React.ReactElement | null {
  const { data: user } = useQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();

  if (!user) return null;

  const onLogout = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      description: '¿Seguro que quieres salir de tu cuenta?',
      confirmText: 'Salir',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await logout();
    } catch {
      // Ignorar: igual limpiamos el estado local.
    }
    realtime.disconnect();
    queryClient.clear();
    await navigate({ to: '/login' });
  };

  return (
    <AppShell user={user} onLogout={() => void onLogout()}>
      <AnimatedOutlet />
    </AppShell>
  );
}
