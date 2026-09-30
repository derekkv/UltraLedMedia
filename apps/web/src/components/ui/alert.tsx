import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative flex gap-3 rounded-md py-3 pl-3.5 pr-4 text-sm', {
  variants: {
    variant: {
      info: 'bg-primary/8 border-l-2 border-l-primary',
      success: 'bg-success/10 border-l-2 border-l-success',
      warning: 'bg-warning/12 border-l-2 border-l-warning',
      destructive: 'bg-destructive/10 border-l-2 border-l-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: XCircle,
};

const ICON_COLOR: Record<AlertVariant, string> = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: boolean;
}

/** Aviso en línea (info / éxito / advertencia / error) con riel de acento a la izquierda. */
export function Alert({
  variant,
  title,
  children,
  className,
  icon = true,
}: AlertProps): React.ReactElement {
  const v: AlertVariant = variant ?? 'info';
  const Icon = ICON[v];
  return (
    <div role="alert" className={cn(alertVariants({ variant: v }), className)}>
      {icon && <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_COLOR[v])} />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && (
          <div className={cn('text-foreground-secondary', title && 'mt-0.5')}>{children}</div>
        )}
      </div>
    </div>
  );
}
