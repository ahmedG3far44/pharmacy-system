import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'outline'|'ghost'|'danger'; size?: 'sm'|'default'|'lg'|'icon' };
const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { default: 'bg-primary text-primary-foreground hover:bg-blue-600', secondary: 'bg-secondary text-secondary-foreground hover:bg-gray-200', outline: 'border border-input bg-background text-secondary-foreground hover:bg-muted', ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground', danger: 'bg-destructive text-destructive-foreground hover:bg-red-600' }, size: { sm: 'h-8 px-3 text-xs', default: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base', icon: 'size-10 p-0' } }, defaultVariants: { variant: 'default', size: 'default' } });
export function Button({ className, variant = 'default', size = 'default', ...props }: Props) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
