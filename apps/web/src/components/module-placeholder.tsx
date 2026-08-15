import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

/** Estado vacío para módulos aún no implementados. */
export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Card className="mt-6 border-dashed">
        <CardContent className="grid place-items-center gap-2 p-12 text-center">
          <span className="size-2.5 rounded-full bg-primary/70 shadow-[0_0_10px_2px_var(--primary)]" />
          <p className="text-sm font-medium text-foreground-secondary">Módulo en construcción</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            La base está lista. El contenido de este módulo se diseña e implementa en su propia
            fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
