import * as React from 'react';
import { cn } from '@/lib/utils';

/** Monograma hexagonal UL de Ultraled Media (adaptable al tema). */
export function LogoMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('text-primary', className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 3 42 13.5 V34.5 L24 45 6 34.5 V13.5 Z"
        className="fill-primary/12 stroke-primary"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path
        d="M17 15 V27 a7 7 0 0 0 7 7 M24 34 V15"
        className="stroke-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M28 15 V34 H35"
        className="stroke-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: LogoProps): React.ReactElement {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-7', markClassName)} />
      {showWordmark && (
        <span className="text-[15px] font-extrabold tracking-tight text-foreground">
          Ultraled
        </span>
      )}
    </div>
  );
}
