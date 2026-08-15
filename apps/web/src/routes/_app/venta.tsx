import { createFileRoute } from '@tanstack/react-router';
import { ModulePlaceholder } from '@/components/module-placeholder';

export const Route = createFileRoute('/_app/venta')({
  component: () => (
    <ModulePlaceholder title="Venta" description="Gestión de ventas de Ultraled Media." />
  ),
});
