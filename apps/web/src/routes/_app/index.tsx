import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { meQueryOptions } from '@/lib/auth';

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
    <Card className={focal ? 'glow border-primary/30' : undefined}>
      <CardContent className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
        {delta && <p className="mt-1 text-xs font-medium text-success">{delta}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data: user } = useQuery(meQueryOptions);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Hola, {user?.fullName ?? ''}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Módulos habilitados: {user?.modules.join(', ') || '—'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Ventas del mes" value="$48,200" delta="↑ 12%" focal />
        <Metric label="Cobranza pendiente" value="$9,340" />
        <Metric label="Clientes activos" value="128" />
        <Metric label="Tickets abiertos" value="7" />
      </div>
    </div>
  );
}
