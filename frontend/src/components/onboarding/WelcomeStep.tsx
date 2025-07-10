'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { timezones, getDetectedTimezone, getTimezoneOffset } from '@/lib/timezones';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTimezones, setShowAllTimezones] = useState(false);

  useEffect(() => {
    // Auto-detect timezone if not already set
    if (!data.timezone) {
      const detectedTimezone = getDetectedTimezone();
      updateData({ timezone: detectedTimezone });
    }
  }, []);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  // Filter timezones based on search query
  const filteredTimezones = timezones.map(group => ({
    ...group,
    zones: group.zones.filter(zone => 
      zone.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zone.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.zones.length > 0);

  // Get common timezones for quick selection
  const commonTimezones = [
    { value: "America/New_York", label: "New York (Eastern)" },
    { value: "America/Chicago", label: "Chicago (Central)" },
    { value: "America/Denver", label: "Denver (Mountain)" },
    { value: "America/Los_Angeles", label: "Los Angeles (Pacific)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Europe/Berlin", label: "Berlin (CET)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "Kolkata (IST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" }
  ];

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
          
          {data.timezone && (
            <div className="mb-2 p-2 bg-app-success/10 border border-app-success/20 rounded-md text-sm text-app-success">
              Auto-detected: {data.timezone} ({getTimezoneOffset(data.timezone)})
            </div>
          )}

          {!showAllTimezones ? (
            <>
              <select
                value={data.timezone}
                onChange={(e) => updateData({ timezone: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground"
              >
                <option value={data.timezone}>
                  {data.timezone} ({getTimezoneOffset(data.timezone)}) - Auto-detected
                </option>
                <optgroup label="Common Timezones">
                  {commonTimezones.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({getTimezoneOffset(tz.value)})
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                onClick={() => setShowAllTimezones(true)}
                className="text-xs text-app-primary hover:underline"
              >
                Show all timezones
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search timezones..."
                className="w-full px-4 py-2 mb-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground"
              />
              <select
                value={data.timezone}
                onChange={(e) => updateData({ timezone: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground"
                size={8}
              >
                {filteredTimezones.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.zones.map(zone => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label} ({getTimezoneOffset(zone.value)})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowAllTimezones(false);
                  setSearchQuery('');
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Show common timezones
              </button>
            </>
          )}
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