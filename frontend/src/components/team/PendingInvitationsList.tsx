import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Clock, 
  RefreshCw, 
  X,
  Loader2,
  Send,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
  days_until_expiry: number;
  invited_by_name: string;
}

interface PendingInvitationsListProps {
  organizationId: string;
  permissions: {
    can_invite_members: boolean;
  };
  onUpdate: () => void;
}

export function PendingInvitationsList({ 
  organizationId, 
  permissions,
  onUpdate 
}: PendingInvitationsListProps) {
  const { session } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, [organizationId]);

  const fetchInvitations = async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/teams/invitations?status=pending', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setInvitations(data.invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending invitations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!session?.access_token || !confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setActionLoading(invitationId);

    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel invitation');
      }

      toast({
        title: 'Success',
        description: 'Invitation cancelled',
      });

      fetchInvitations();
      onUpdate();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel invitation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!session?.access_token) return;

    setActionLoading(invitationId);

    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend invitation');
      }

      toast({
        title: 'Success',
        description: 'Invitation resent',
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Pending Invitations</h2>
          <Badge variant="secondary" className="ml-2">
            {invitations.length}
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-border">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{invitation.email}</p>
                  <Badge variant="outline" className="capitalize">
                    {invitation.role}
                  </Badge>
                  {invitation.is_expired && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Invited by {invitation.invited_by_name}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {invitation.is_expired ? (
                      <span>Expired {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}</span>
                    ) : (
                      <span>Expires in {invitation.days_until_expiry} {invitation.days_until_expiry === 1 ? 'day' : 'days'}</span>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </p>
              </div>

              {permissions.can_invite_members && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleResendInvitation(invitation.id)}
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === invitation.id}
                  >
                    {actionLoading === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === invitation.id}
                  >
                    {actionLoading === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}