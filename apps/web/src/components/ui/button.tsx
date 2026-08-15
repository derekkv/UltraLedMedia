import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // CTA de marca: magenta encendido
        default:
          'bg-accent text-accent-foreground hover:brightness-110 shadow-[0_0_16px_-4px_var(--accent)]',
        // Acción primaria neón cian
        primary:
          'bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_16px_-4px_var(--primary)]',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-primary/60 hover:text-primary',
        ghost: 'bg-transparent text-foreground-secondary hover:bg-surface-2 hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-110 shadow-[0_0_16px_-4px_var(--destructive)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-sm px-3',
        lg: 'h-11 rounded-lg px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps): React.ReactElement {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
