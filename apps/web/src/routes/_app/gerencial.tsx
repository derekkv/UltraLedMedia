import { createFileRoute } from '@tanstack/react-router';
import { ModulePlaceholder } from '@/components/module-placeholder';

export const Route = createFileRoute('/_app/gerencial')({
  component: () => (
    <ModulePlaceholder title="Gerencial" description="Indicadores y control gerencial." />
  ),
});
