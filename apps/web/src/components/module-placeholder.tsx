import * as React from 'react';
import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { fadeRise } from '@/lib/motion';

/** Estado para módulos aún no implementados: solo "Módulo en construcción". */
export function ModulePlaceholder(): React.ReactElement {
  return (
    <motion.div
      variants={fadeRise}
      initial="hidden"
      animate="show"
      className="grid min-h-[60vh] place-items-center"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-surface-2 text-muted-foreground">
          <Wrench className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">Módulo en construcción</p>
      </div>
    </motion.div>
  );
}
