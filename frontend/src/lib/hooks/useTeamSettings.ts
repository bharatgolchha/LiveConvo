import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TeamSettings {
  organization: {
    id: string;
    name: string;
    created_at: string;
    user_role: string;
  };
  invitation_settings: {
    auto_approve_domain: string | null;
    default_role: 'member' | 'admin';
    invitation_message_template: string | null;
    max_pending_invitations: number;
    invitation_expiry_days: number;
    allow_external_invitations: boolean;
  };
  subscription: {
    plan_name: string;
    billing_type: string;
    supports_team_billing: boolean;
    price_per_seat: number | null;
    team_discount: number | null;
    next_billing_date: string;
    minimum_seats: number;
    maximum_seats: number | null;
  } | null;
  seat_usage: {
    total_seats: number;
    used_seats: number;
    available_seats: number;
    pending_invitations: number;
    can_invite: boolean;
  };
  permissions: {
    can_invite_members: boolean;
    can_remove_members: boolean;
    can_change_billing: boolean;
    can_update_settings: boolean;
  };
}

export function useTeamSettings() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!session?.access_token) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/teams/settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch team settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching team settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [session]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
  };
}