import type { Transition, Variants } from 'framer-motion';

/** Curva ease-out estándar del sistema. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const transition: Transition = { duration: 0.24, ease: EASE_OUT };
export const transitionFast: Transition = { duration: 0.16, ease: EASE_OUT };

/** Entrada con leve elevación (para páginas y tarjetas). */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition },
};

/** Contenedor con stagger para listas/grids. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: transitionFast },
};

/** Overlay y contenido de modales. */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionFast },
  exit: { opacity: 0, transition: transitionFast },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition },
  exit: { opacity: 0, scale: 0.96, transition: transitionFast },
};
