import * as React from 'react';
import { createFileRoute, redirect, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { meQueryOptions, logout } from '@/lib/auth';
import { ApiException } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { realtime } from '@/lib/ws';

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

function AppLayout(): React.ReactElement | null {
  const { data: user } = useQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!user) return null;

  const onLogout = async (): Promise<void> => {
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
      <Outlet />
    </AppShell>
  );
}
