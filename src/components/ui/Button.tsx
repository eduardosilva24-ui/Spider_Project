import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-red-300/20 bg-spider-red text-white shadow-glow hover:bg-red-500 active:bg-spider-crimson',
  secondary: 'border border-white/10 bg-white/[0.075] text-spider-ink hover:bg-white/[0.12]',
  ghost: 'border border-transparent bg-transparent text-spider-muted hover:bg-white/[0.075] hover:text-spider-ink',
  danger: 'border border-red-500/25 bg-red-950/60 text-red-100 hover:bg-red-900/70',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-2 rounded-lg px-3 text-sm',
  md: 'h-11 gap-2 rounded-lg px-4 text-sm',
  icon: 'h-10 w-10 rounded-lg p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
