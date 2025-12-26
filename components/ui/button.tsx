import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-0 focus:border-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white font-bold hover:bg-primary/93 hover:shadow-[0_0_10px_rgba(249,115,22,0.4)] dark:text-gray-900 dark:hover:shadow-[0_0_7px_rgba(249,115,22,0.5)]',
        success:
          'bg-green-600 text-white font-bold hover:bg-green-600/93 hover:shadow-[0_0_10px_rgba(22,163,74,0.4)] dark:bg-green-600 dark:text-white dark:hover:bg-green-600/93 dark:hover:shadow-[0_0_7px_rgba(22,163,74,0.5)]',
        successOutline:
          'border border-green-600 bg-background text-green-600 hover:border-green-700 hover:text-green-700 hover:bg-green-50 dark:border-green-500 dark:bg-background dark:text-green-500 dark:hover:border-green-400 dark:hover:text-green-400 dark:hover:bg-green-950/20',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-border bg-background text-foreground hover:border-primary hover:text-primary dark:border-border dark:bg-background dark:text-foreground dark:hover:border-primary dark:hover:text-primary',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        subtle:
          'bg-transparent text-foreground hover:bg-muted/60 hover:rounded-sm dark:text-foreground dark:hover:bg-zinc-800',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
