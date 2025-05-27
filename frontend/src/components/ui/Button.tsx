import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Button component with multiple variants and sizes.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  disabled,
  loading = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300',
    destructive: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    link: 'bg-transparent hover:bg-transparent text-blue-600 hover:text-blue-700 underline border-transparent p-0'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
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
        children
      )}
    </button>
  );
};

export default Button;
