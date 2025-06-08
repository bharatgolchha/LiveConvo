'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  company: string;
  use_case: string;
  referral_source: string | null;
  interest_level: string | null;
  created_at: string;
  approved_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  useEffect(() => {
    fetchWaitlistEntries();
  }, []);

  const fetchWaitlistEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/waitlist', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/waitlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchWaitlistEntries();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.referral_source?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || entry.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getInterestBadge = (level: string | null) => {
    if (!level) return null;
    
    const styles = {
      high: 'bg-purple-100 text-purple-800 border-purple-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge className={styles[level as keyof typeof styles] || styles.medium}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Interest
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading waitlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Beta Waitlist</h1>
        <p className="text-muted-foreground">Manage users on the beta waitlist</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.filter(e => e.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.filter(e => e.status === 'approved').length}
              </p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.filter(e => e.status === 'rejected').length}
              </p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Waitlist Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Company</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Use Case</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    No entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{entry.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
                        <span>{entry.email}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {entry.company}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="p-4">
                      <div className="max-w-xs">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="text-sm text-muted-foreground truncate hover:text-primary underline cursor-pointer text-left"
                          title="Click to view full details"
                        >
                          {entry.use_case}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4">
                      {entry.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateStatus(entry.id, 'approved')}
                            disabled={updating === entry.id}
                          >
                            {updating === entry.id ? 'Updating...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateStatus(entry.id, 'rejected')}
                            disabled={updating === entry.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {entry.status === 'approved' && (
                        <span className="text-sm text-green-600">
                          Approved {entry.approved_at && format(new Date(entry.approved_at), 'MMM d')}
                        </span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="text-sm text-red-600">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Waitlist Entry Details</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{selectedEntry.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{selectedEntry.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-lg">{selectedEntry.company}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Use Case</label>
                  <p className="text-base whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {selectedEntry.use_case}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p>{format(new Date(selectedEntry.created_at), 'MMMM d, yyyy h:mm a')}</p>
                </div>
                
                {selectedEntry.approved_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved</label>
                    <p>{format(new Date(selectedEntry.approved_at), 'MMMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                
                {selectedEntry.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-base whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {selectedEntry.notes}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                {selectedEntry.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => {
                        updateStatus(selectedEntry.id, 'approved');
                        setSelectedEntry(null);
                      }}
                      disabled={updating === selectedEntry.id}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        updateStatus(selectedEntry.id, 'rejected');
                        setSelectedEntry(null);
                      }}
                      disabled={updating === selectedEntry.id}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntry(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}