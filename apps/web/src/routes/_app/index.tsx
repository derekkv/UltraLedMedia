import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { api } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { daysUntil, timeAgo } from '@/lib/format';
import {
  clientesQueryKey,
  formatMoney,
  ESTADO_BADGE,
  ESTADO_LABELS,
  type ClienteListResponse,
} from '@/lib/clientes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
});

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const ESTADO_DOT: Record<string, string> = {
  ACTIVO: 'bg-success',
  PAUSADO: 'bg-warning',
  VENCIDO: 'bg-destructive',
  CANCELADO: 'bg-muted-foreground',
};

function DashboardPage(): React.ReactElement {
  const { data: user } = useQuery(meQueryOptions);
  const canReadVenta = user?.permissions.includes('venta:read') ?? false;

  const clientesQuery = useQuery({
    queryKey: [...clientesQueryKey, 'dashboard'],
    queryFn: () => api.get<ClienteListResponse>('/clientes?limit=100'),
    enabled: canReadVenta,
  });

  const all = clientesQuery.data?.items ?? [];
  const total = all.length;
  const activos = all.filter((c) => c.estado === 'ACTIVO').length;
  const porVencer = all.filter(
    (c) => c.estado !== 'CANCELADO' && daysUntil(c.fechaVencimiento) >= 0 && daysUntil(c.fechaVencimiento) <= 7,
  ).length;
  const valorActivo = all
    .filter((c) => c.estado === 'ACTIVO')
    .reduce((sum, c) => sum + c.valorPlan, 0);
  const recientes = all.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl">
      <p className={EYEBROW}>Panel de operaciones</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {user?.fullName ?? ''}</h1>
        <div className="flex flex-wrap gap-1.5">
          {(user?.modules ?? []).map((m) => (
            <Badge key={m} variant="muted">
              {m.toLowerCase()}
            </Badge>
          ))}
        </div>
      </div>

      {!canReadVenta ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted-foreground">
              <LayoutGrid className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Accede a tus módulos para comenzar a trabajar.
            </p>
            <Button asChild size="sm">
              <Link to="/modulos">Ir a módulos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Resumen de clientes y contratos.</p>

          {/* Resumen real */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            <StatCard label="Clientes" value={clientesQuery.isLoading ? null : String(total)} />
            <StatCard
              label="En pantalla"
              value={clientesQuery.isLoading ? null : String(activos)}
              dot="bg-success"
            />
            <StatCard
              label="Por vencer (7d)"
              value={clientesQuery.isLoading ? null : String(porVencer)}
              dot="bg-warning"
              tone={porVencer > 0 ? 'warning' : undefined}
            />
            <StatCard
              label="Valor activo"
              value={clientesQuery.isLoading ? null : formatMoney(valorActivo)}
            />
          </motion.div>

          {/* Clientes recientes */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Clientes recientes</h2>
            <Link
              to="/venta"
              className="flex items-center gap-0.5 text-xs font-medium text-secondary hover:underline"
            >
              Ver todos <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <Card className="mt-3">
            <CardContent className="p-0">
              {clientesQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : recientes.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aún no hay clientes registrados.
                </div>
              ) : (
                <ul className="flex flex-col gap-1 p-2">
                  {recientes.map((c) => (
                    <li key={c.id}>
                      <Link
                        to="/venta"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn('size-2 shrink-0 rounded-full', ESTADO_DOT[c.estado])}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.razonSocial}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ESTADO_LABELS[c.estado]} · registrado {timeAgo(c.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(c.valorPlan)}
                        </span>
                        <Badge variant={ESTADO_BADGE[c.estado]}>{ESTADO_LABELS[c.estado]}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  dot,
  tone,
}: {
  label: string;
  value: string | null;
  dot?: string;
  tone?: 'warning' | 'destructive';
}): React.ReactElement {
  const valueColor =
    tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <motion.div variants={staggerItem}>
      <Card className="h-full">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
            <p className={EYEBROW}>{label}</p>
          </div>
          {value === null ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', valueColor)}>{value}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
