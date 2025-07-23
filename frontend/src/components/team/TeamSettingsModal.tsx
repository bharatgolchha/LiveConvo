import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Settings, Globe, Shield, Mail, Calendar, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSettings: {
    auto_approve_domain: string | null;
    default_role: 'member' | 'admin';
    invitation_message_template: string | null;
    max_pending_invitations: number;
    invitation_expiry_days: number;
    allow_external_invitations: boolean;
  };
}

export function TeamSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  currentSettings,
}: TeamSettingsModalProps) {
  const { session } = useAuth();
  const [settings, setSettings] = useState(currentSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.access_token) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast({
        title: 'Success',
        description: 'Team settings updated successfully',
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSettings(currentSettings);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Team Settings
            </DialogTitle>
            <DialogDescription>
              Configure how team invitations and members are managed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {error && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <p className="text-sm text-destructive">{error}</p>
              </Alert>
            )}

            {/* Auto-approve Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Auto-approve Domain
              </Label>
              <Input
                id="domain"
                type="text"
                placeholder="@company.com"
                value={settings.auto_approve_domain || ''}
                onChange={(e) => setSettings({ ...settings, auto_approve_domain: e.target.value || null })}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Users with this email domain will automatically be approved when they sign up with an invitation.
              </p>
            </div>

            {/* Default Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Default Member Role
              </Label>
              <Select
                value={settings.default_role}
                onValueChange={(value: 'member' | 'admin') => 
                  setSettings({ ...settings, default_role: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The default role assigned to new team members.
              </p>
            </div>

            {/* Invitation Limits */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-invites" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Max Pending Invitations
                </Label>
                <Input
                  id="max-invites"
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.max_pending_invitations}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    max_pending_invitations: parseInt(e.target.value) || 50 
                  })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Invitation Expiry (days)
                </Label>
                <Input
                  id="expiry"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.invitation_expiry_days}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    invitation_expiry_days: parseInt(e.target.value) || 7 
                  })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* External Invitations */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="external" className="text-base">
                  Allow External Invitations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow inviting users from outside your organization's domain.
                </p>
              </div>
              <Switch
                id="external"
                checked={settings.allow_external_invitations}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, allow_external_invitations: checked })
                }
                disabled={isLoading}
              />
            </div>

            {/* Custom Message Template */}
            <div className="space-y-2">
              <Label htmlFor="template">
                Default Invitation Message (Optional)
              </Label>
              <Textarea
                id="template"
                placeholder="Welcome to our team! We're excited to have you join us..."
                value={settings.invitation_message_template || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  invitation_message_template: e.target.value || null 
                })}
                rows={4}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in invitation emails. Team members can override this when sending invitations.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}