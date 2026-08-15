import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/theme';
import { transitionFast } from '@/lib/motion';

export function ThemeToggle(): React.ReactElement {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="relative grid size-9 place-items-center overflow-hidden rounded-md text-foreground-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
          transition={transitionFast}
          className="grid place-items-center"
        >
          {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
