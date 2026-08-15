import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { meQueryOptions } from '@/lib/auth';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
});

function Metric({
  label,
  value,
  delta,
  focal = false,
}: {
  label: string;
  value: string;
  delta?: string;
  focal?: boolean;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Card className={cn('h-full', focal && 'border-primary/40')}>
        <CardContent className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
          {delta && (
            <p className="mt-1 text-xs font-medium text-success">{delta} vs. mes anterior</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardPage() {
  const { data: user } = useQuery(meQueryOptions);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Hola, {user?.fullName ?? ''}</h1>
        <div className="flex flex-wrap gap-1.5">
          {(user?.modules ?? []).map((m) => (
            <Badge key={m} variant="primary">
              {m.toLowerCase()}
            </Badge>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Resumen de operaciones (datos de muestra).
      </p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Metric label="Ventas del mes" value="$48,200" delta="↑ 12%" focal />
        <Metric label="Cobranza pendiente" value="$9,340" />
        <Metric label="Clientes activos" value="128" />
        <Metric label="Tickets abiertos" value="7" />
      </motion.div>
    </div>
  );
}
