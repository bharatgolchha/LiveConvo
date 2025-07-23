import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'button';
  className?: string;
}

export function ThemeToggle({ variant = 'button', className }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn(
          "w-8 h-8 px-0 border-0 relative overflow-hidden",
          className
        )}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-medium text-foreground mb-2">Theme</span>
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setTheme('light')}
          className={cn(
            "flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
            theme === 'light'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="h-4 w-4 mr-2" />
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            "flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
            theme === 'dark'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className={cn(
            "flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
            theme === 'system'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-4 w-4 mr-2" />
          System
        </button>
      </div>
    </div>
  );
} 