'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface WelcomeStepProps {
  data: {
    organization_name: string;
    timezone: string;
  };
  updateData: (data: any) => void;
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  data,
  updateData,
  onNext
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome aboard!
        </h1>
        <p className="text-muted-foreground text-lg">
          Let's get your workspace ready for AI-powered conversations
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-foreground">
            <Building2 className="w-4 h-4 mr-2 text-app-primary" />
            Organization Name
          </label>
          <input
            type="text"
            value={data.organization_name}
            onChange={(e) => updateData({ organization_name: e.target.value })}
            placeholder="e.g. Acme Corp or John's Workspace"
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            This helps personalize your experience. You can change it later.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-foreground">
            <Clock className="w-4 h-4 mr-2 text-app-success" />
            Your Timezone
          </label>
          <select
            value={data.timezone}
            onChange={(e) => updateData({ timezone: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground"
          >
            <optgroup label="North America">
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </optgroup>
            <optgroup label="Europe">
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Europe/Berlin">Berlin (CET)</option>
              <option value="Europe/Amsterdam">Amsterdam (CET)</option>
            </optgroup>
            <optgroup label="Asia">
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
              <option value="Asia/Kolkata">Mumbai (IST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
            </optgroup>
            <optgroup label="Other">
              <option value="Australia/Sydney">Sydney (AEST)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="pt-6">
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Continue
        </Button>
      </div>
    </form>
  );
};