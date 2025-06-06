'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow, format } from 'date-fns';
import { adminFetch } from '@/lib/adminApi';

interface UserDetails {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  organization?: {
    id: string;
    name: string;
    current_plan: string;
  };
  stats?: {
    total_sessions: number;
    total_audio_minutes: number;
    last_session_at: string | null;
  };
  sessions?: Array<{
    id: string;
    title: string;
    created_at: string;
    duration_minutes: number;
    status: string;
  }>;
}

export default function UserDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchUserDetails(id as string);
    }
  }, [id]);

  const fetchUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      const data = await adminFetch(`/api/admin/users/${userId}`);
      setUser(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    
    try {
      await adminFetch(`/api/admin/users/${user.id}/toggle-status`, {
        method: 'POST'
      });
      // Refresh user data
      fetchUserDetails(user.id);
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 text-lg">
          {error || 'User not found'}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
          >
            ← Back to Users
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {user.full_name || 'Unnamed User'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              user.is_active
                ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600'
                : 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600'
            }`}
          >
            {user.is_active ? 'Deactivate' : 'Activate'} User
          </button>
        </div>
      </div>

      {/* User Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
                {user.is_admin && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {user.stats?.total_sessions || 0}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Audio Minutes</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {Math.round(user.stats?.total_audio_minutes || 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">User ID</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{user.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {user.full_name || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Created</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {format(new Date(user.created_at), 'PPP')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Login</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {user.last_login_at 
                ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                : 'Never'
              }
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Session</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {user.stats?.last_session_at 
                ? formatDistanceToNow(new Date(user.stats.last_session_at), { addSuffix: true })
                : 'No sessions'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Organization Information */}
      {user.organization && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Organization
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization Name</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{user.organization.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Plan</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{user.organization.current_plan}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Sessions
        </h2>
        {user.sessions && user.sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {user.sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.title || 'Untitled Session'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {session.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {Math.round(session.duration_minutes)} minutes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(session.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No sessions found.</p>
        )}
      </Card>
    </div>
  );
} 