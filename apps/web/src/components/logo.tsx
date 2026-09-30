import * as React from 'react';
import { cn } from '@/lib/utils';

/** Marca de Ultraled Media (logo PNG oficial). */
export function LogoMark({ className }: { className?: string }): React.ReactElement {
  return (
    <img
      src="/logo.png"
      alt="Ultraled Media"
      width={256}
      height={256}
      className={cn('size-7 object-contain', className)}
      draggable={false}
    />
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
        <span className="text-[15px] font-bold uppercase tracking-tight text-foreground">
          Ultra<span className="font-extrabold text-secondary">Led</span>
        </span>
      )}
    </div>
  );
}
