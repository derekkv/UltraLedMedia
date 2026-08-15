import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
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

function HomePage() {
  return (
    <AppShell activeKey="GERENCIAL">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel gerencial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista general de operaciones (datos de muestra).
            </p>
          </div>
          <Button variant="primary" size="sm" className="hidden md:inline-flex">
            Nueva acción
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Ventas del mes" value="$48,200" delta="↑ 12%" focal />
          <Metric label="Cobranza pendiente" value="$9,340" />
          <Metric label="Clientes activos" value="128" />
          <Metric label="Tickets abiertos" value="7" />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Base lista</CardTitle>
            <CardDescription>
              Sistema de diseño, shell responsive y clientes de API/WebSocket montados. Los módulos
              se conectan en las siguientes fases.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="default" size="sm">
              CTA (magenta)
            </Button>
            <Button variant="outline" size="sm">
              Secundario
            </Button>
            <Button variant="destructive" size="sm">
              Error
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
