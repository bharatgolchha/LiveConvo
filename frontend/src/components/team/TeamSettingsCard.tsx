import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Globe, 
  Mail, 
  Shield,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { TeamSettingsModal } from './TeamSettingsModal';

interface TeamSettingsCardProps {
  settings: {
    auto_approve_domain: string | null;
    default_role: 'member' | 'admin';
    invitation_message_template: string | null;
    max_pending_invitations: number;
    invitation_expiry_days: number;
    allow_external_invitations: boolean;
  };
  permissions: {
    can_update_settings: boolean;
  };
  onUpdate: () => void;
}

export function TeamSettingsCard({ settings, permissions, onUpdate }: TeamSettingsCardProps) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Team Settings</h2>
            </div>
            
            {permissions.can_update_settings && (
              <Button
                onClick={() => setIsSettingsModalOpen(true)}
                size="sm"
                variant="outline"
              >
                Configure
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Auto-approve Domain */}
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Auto-approve Domain</p>
                <p className="text-sm text-muted-foreground">
                  {settings.auto_approve_domain || 'Not configured'}
                </p>
              </div>
            </div>

            {/* Default Role */}
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Default Member Role</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {settings.default_role}
                </Badge>
              </div>
            </div>

            {/* Invitation Settings */}
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Invitation Settings</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Max {settings.max_pending_invitations} pending
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {settings.invitation_expiry_days} day expiry
                  </Badge>
                </div>
              </div>
            </div>

            {/* External Invitations */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">External Invitations</p>
                  <p className="text-xs text-muted-foreground">
                    Allow inviting users outside your domain
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {settings.allow_external_invitations ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <X className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <TeamSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSuccess={onUpdate}
        currentSettings={settings}
      />
    </>
  );
}