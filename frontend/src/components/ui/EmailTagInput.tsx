import React, { useState, KeyboardEvent, ClipboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EmailTagInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  maxEmails?: number;
  disabled?: boolean;
}

export function EmailTagInput({
  value,
  onChange,
  placeholder = "Enter email addresses...",
  className,
  maxEmails,
  disabled = false
}: EmailTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const addEmails = (emails: string[]) => {
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    emails.forEach(email => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) return;

      if (!validateEmail(trimmedEmail)) {
        invalidEmails.push(trimmedEmail);
      } else if (value.includes(trimmedEmail)) {
        // Skip duplicates silently
      } else {
        validEmails.push(trimmedEmail);
      }
    });

    if (invalidEmails.length > 0) {
      setError(`Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`);
      setTimeout(() => setError(null), 3000);
    }

    if (validEmails.length > 0) {
      if (maxEmails && value.length + validEmails.length > maxEmails) {
        setError(`Maximum ${maxEmails} emails allowed`);
        setTimeout(() => setError(null), 3000);
        const remainingSlots = maxEmails - value.length;
        onChange([...value, ...validEmails.slice(0, remainingSlots)]);
      } else {
        onChange([...value, ...validEmails]);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmails([inputValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last email when backspace is pressed on empty input
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Split by common delimiters: comma, semicolon, space, newline
    const emails = pastedText.split(/[,;\s\n]+/).filter(Boolean);
    addEmails(emails);
    setInputValue('');
  };

  const removeEmail = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmails([inputValue]);
      setInputValue('');
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 rounded-md border bg-background min-h-[38px]",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {value.map((email, index) => (
          <Badge
            key={`${email}-${index}`}
            variant="secondary"
            className="pl-2 pr-1 py-0.5 text-xs font-normal h-6"
          >
            {email}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeEmail(index)}
                className="ml-1.5 rounded-full p-0.5 hover:bg-secondary-foreground/20 transition-colors"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          disabled={disabled || (maxEmails ? value.length >= maxEmails : false)}
          className={cn(
            "flex-1 min-w-[150px] bg-transparent outline-none text-sm",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed"
          )}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {maxEmails && value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {maxEmails} emails added
        </p>
      )}
    </div>
  );
}