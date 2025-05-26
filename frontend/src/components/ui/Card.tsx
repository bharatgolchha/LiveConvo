import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card component for displaying content in a structured container.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  const variants = {
    default: 'bg-white shadow-md border border-gray-200',
    elevated: 'bg-white shadow-xl border border-gray-100',
    subtle: 'bg-gray-50/80 shadow-sm border border-gray-100'
  };

  return (
    <div 
      className={cn(
        'rounded-lg transition-all duration-200',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader component for card titles and descriptions.
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
    {children}
  </div>
);

/**
 * CardTitle component for card titles.
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, ...props }) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
    {children}
  </h3>
);

/**
 * CardDescription component for card descriptions.
 */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className, ...props }) => (
  <p className={cn('text-sm text-gray-600', className)} {...props}>
    {children}
  </p>
);

/**
 * CardContent component for main card content.
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
);

/**
 * CardFooter component for card actions.
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
    {children}
  </div>
);

export default Card;
