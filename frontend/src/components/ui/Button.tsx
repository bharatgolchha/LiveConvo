import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Button component with multiple variants and sizes.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  /** Optional icon displayed before the children */
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  icon,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  loading = false,
  ...props
}) => {
  const variants = {
    primary: 'bg-app-primary hover:bg-app-primary-dark text-white border-transparent',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border',
    ghost: 'bg-transparent hover:bg-accent text-foreground border-transparent',
    outline: 'bg-transparent hover:bg-accent text-foreground border-border',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground border-transparent',
    link: 'bg-transparent hover:bg-transparent text-app-primary hover:text-app-primary-dark underline border-transparent p-0'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-app-primary focus:ring-offset-2 focus:ring-offset-background',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </div>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
