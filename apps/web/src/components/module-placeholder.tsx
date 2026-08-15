import * as React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { fadeRise } from '@/lib/motion';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/** Estado vacío para módulos aún no implementados. */
export function ModulePlaceholder({
  title,
  description,
  icon,
}: ModulePlaceholderProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <motion.div variants={fadeRise} initial="hidden" animate="show">
        <Card className="mt-6 border-dashed">
          <CardContent className="grid place-items-center gap-3 p-14 text-center">
            {icon && <div className="text-primary">{icon}</div>}
            <p className="text-sm font-semibold text-foreground">Módulo en construcción</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              La base está lista. El contenido de este módulo se diseña e implementa en su propia
              fase.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
