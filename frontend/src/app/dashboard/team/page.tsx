'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TeamPageLayout } from '@/components/team/TeamPageLayout';
import { TeamMembersList } from '@/components/team/TeamMembersList';
import { TeamBillingCard } from '@/components/team/TeamBillingCard';
import { TeamSettingsCard } from '@/components/team/TeamSettingsCard';
import { PendingInvitationsList } from '@/components/team/PendingInvitationsList';
import { Alert } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useTeamSettings } from '@/lib/hooks/useTeamSettings';

export default function TeamPage() {
  const { user } = useAuth();
  const { settings, isLoading, error, refetch } = useTeamSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-destructive/50 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </Alert>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <p>No team information available.</p>
        </Alert>
      </div>
    );
  }

  const { organization, permissions, seat_usage, subscription } = settings;

  return (
    <TeamPageLayout
      organizationName={organization.name}
      userRole={organization.user_role}
    >
      <div className="space-y-6">
        {/* Team Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <TeamBillingCard
            subscription={subscription}
            seatUsage={seat_usage}
            permissions={permissions}
            onRefresh={refetch}
          />
          
          <TeamSettingsCard
            settings={settings.invitation_settings}
            permissions={permissions}
            onUpdate={refetch}
          />
        </div>

        {/* Team Members */}
        <TeamMembersList
          organizationId={organization.id}
          currentUserRole={organization.user_role}
          permissions={permissions}
          seatUsage={seat_usage}
          onUpdate={refetch}
        />

        {/* Pending Invitations */}
        {permissions.can_invite_members && (
          <PendingInvitationsList
            organizationId={organization.id}
            permissions={permissions}
            onUpdate={refetch}
          />
        )}
      </div>
    </TeamPageLayout>
  );
}