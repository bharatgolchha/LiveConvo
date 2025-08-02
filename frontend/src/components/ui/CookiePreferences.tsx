'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCookieConsent, setCookieConsent, CookieConsent } from '@/lib/cookies/cookie-consent';
import { Shield, BarChart, Settings, Megaphone } from 'lucide-react';

interface CookiePreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const CookiePreferences: React.FC<CookiePreferencesProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const [preferences, setPreferences] = useState<CookieConsent>({
    essential: true,
    analytics: true,
    functional: true,
    marketing: true,
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (open) {
      const current = getCookieConsent();
      if (current) {
        setPreferences(current);
      }
    }
  }, [open]);

  const handleSave = () => {
    setCookieConsent(preferences);
    onSave();
    onOpenChange(false);
  };

  const cookieCategories = [
    {
      id: 'essential' as const,
      icon: Shield,
      title: 'Essential Cookies',
      description: 'Required for the website to function properly. These cookies are necessary for authentication, security, and basic functionality.',
      examples: 'Authentication tokens, security cookies, session management',
      required: true,
    },
    {
      id: 'analytics' as const,
      icon: BarChart,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      examples: 'Google Analytics, usage statistics, performance monitoring',
      required: false,
    },
    {
      id: 'functional' as const,
      icon: Settings,
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization, such as remembering your preferences and providing live chat support.',
      examples: 'Theme preferences, language settings, Intercom chat',
      required: false,
    },
    {
      id: 'marketing' as const,
      icon: Megaphone,
      title: 'Marketing Cookies',
      description: 'Used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.',
      examples: 'Google Ads, conversion tracking, retargeting',
      required: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Manage your cookie preferences. You can enable or disable different categories of cookies below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {cookieCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="space-y-3 border-b border-border pb-6 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={category.id} className="text-base font-medium cursor-pointer">
                          {category.title}
                        </Label>
                        {category.required && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Examples:</span> {category.examples}
                      </p>
                    </div>
                  </div>
                  
                  <Switch
                    id={category.id}
                    checked={preferences[category.id]}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, [category.id]: checked }))
                    }
                    disabled={category.required}
                    className="mt-1"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};