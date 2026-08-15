import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover elevated-1',
        secondary: 'border border-border bg-surface-2 text-foreground hover:border-border-strong',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-surface-2',
        ghost: 'bg-transparent text-foreground-secondary hover:bg-surface-2 hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-95 elevated-1',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 rounded-sm px-3 text-[13px]',
        lg: 'h-11 rounded-lg px-6 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
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
