import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingCart, Receipt, LineChart, Users, ChevronRight, type LucideIcon } from 'lucide-react';
import type { ModuleKey } from '@ultraled/shared';
import { meQueryOptions } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { staggerContainer, staggerItem } from '@/lib/motion';

export const Route = createFileRoute('/_app/modulos')({
  component: ModulosPage,
});

interface ModuleEntry {
  key: ModuleKey;
  to: LinkProps['to'];
  label: string;
  description: string;
  icon: LucideIcon;
}

const MODULES: ModuleEntry[] = [
  {
    key: 'VENTA',
    to: '/venta',
    label: 'Venta',
    description: 'Registro de clientes y contratos de publicidad.',
    icon: ShoppingCart,
  },
  {
    key: 'COBRANZA',
    to: '/cobranza',
    label: 'Cobranza',
    description: 'Pagos mensuales y seguimiento de vencimientos.',
    icon: Receipt,
  },
  {
    key: 'GERENCIAL',
    to: '/gerencial',
    label: 'Gerencial',
    description: 'Indicadores y control del negocio.',
    icon: LineChart,
  },
  {
    key: 'CLIENTES',
    to: '/clientes',
    label: 'Clientes',
    description: 'Directorio y ficha de clientes.',
    icon: Users,
  },
];

function ModulosPage(): React.ReactElement {
  const { data: me } = useQuery(meQueryOptions);
  const available = MODULES.filter((m) => me?.modules.includes(m.key));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Módulos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accede a los módulos habilitados para tu cuenta.
      </p>

      {available.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="px-5 py-12 text-center text-sm text-muted-foreground">
            No tienes módulos habilitados. Contacta a un administrador.
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          {available.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div key={m.key} variants={staggerItem}>
                <Link to={m.to} className="group block">
                  <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary/12 text-secondary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-semibold">{m.label}</h2>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
