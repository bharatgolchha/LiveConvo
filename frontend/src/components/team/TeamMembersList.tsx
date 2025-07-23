import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  MoreVertical, 
  Shield, 
  UserMinus, 
  Mail,
  Clock,
  Activity,
  Loader2,
  UserPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InviteTeamMemberModal } from './InviteTeamMemberModal';
import { toast } from '@/components/ui/use-toast';

interface TeamMember {
  id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    last_sign_in_at: string | null;
    total_sessions: number;
    total_audio_seconds: number;
  };
  current_period_usage?: {
    minutes: number;
    last_activity: string | null;
  };
}

interface TeamMembersListProps {
  organizationId: string;
  currentUserRole: string;
  permissions: {
    can_invite_members: boolean;
    can_remove_members: boolean;
  };
  seatUsage: {
    available_seats: number;
    can_invite: boolean;
  };
  onUpdate: () => void;
}

export function TeamMembersList({ 
  organizationId, 
  currentUserRole, 
  permissions,
  seatUsage,
  onUpdate 
}: TeamMembersListProps) {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/teams/members?includeStats=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setMembers(data.members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!session?.access_token || !confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    setRemovingMemberId(memberId);

    try {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });

      fetchMembers();
      onUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });

      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
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

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Team Members</h2>
              <Badge variant="secondary" className="ml-2">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Badge>
            </div>
            
            {permissions.can_invite_members && seatUsage.can_invite && (
              <Button 
                onClick={() => setIsInviteModalOpen(true)}
                size="sm"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="p-6 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <Avatar className="w-12 h-12">
                    {member.user.avatar_url && (
                      <AvatarImage src={member.user.avatar_url} alt={member.user.full_name || member.user.email} />
                    )}
                    <AvatarFallback className="bg-primary/10">
                      <span className="text-lg font-medium text-primary">
                        {(member.user.full_name || member.user.email)[0].toUpperCase()}
                      </span>
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {member.user.full_name || member.user.email}
                      </h3>
                      <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                        {member.role === 'owner' && <Shield className="w-3 h-3" />}
                        {member.role}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.user.email}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                      </div>
                    </div>

                    {member.current_period_usage && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {member.current_period_usage.minutes} minutes this period
                        </div>
                        
                        {member.user.last_sign_in_at && (
                          <div>
                            Last active {formatDistanceToNow(new Date(member.user.last_sign_in_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {currentUserRole !== 'member' && member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentUserRole === 'owner' && member.role !== 'owner' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {permissions.can_remove_members && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMemberId === member.id}
                          className="text-destructive focus:text-destructive"
                        >
                          {removingMemberId === member.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4 mr-2" />
                          )}
                          Remove from Team
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <InviteTeamMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          fetchMembers();
          onUpdate();
        }}
        availableSeats={seatUsage.available_seats}
      />
    </>
  );
}