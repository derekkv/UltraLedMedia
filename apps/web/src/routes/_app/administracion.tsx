import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Users, ChevronRight, ScrollText } from 'lucide-react';
import { meQueryOptions } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { staggerContainer, staggerItem } from '@/lib/motion';

export const Route = createFileRoute('/_app/administracion')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!me.roles.includes('ADMIN')) throw redirect({ to: '/' });
  },
  component: AdministracionPage,
});

const ADMIN_ITEMS = [
  {
    to: '/usuarios' as const,
    label: 'Usuarios',
    description: 'Crear usuarios, asignar roles y controlar el acceso.',
    icon: Users,
  },
  {
    to: '/actividad' as const,
    label: 'Actividad',
    description: 'Registro de auditoría: quién hizo qué, cuándo y qué cambió.',
    icon: ScrollText,
  },
];

function AdministracionPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestión del sistema y control de accesos.
      </p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {ADMIN_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.to} variants={staggerItem} className="h-full">
              <Link to={item.to} className="group block h-full">
                <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary/12 text-secondary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold">{item.label}</h2>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
