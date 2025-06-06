'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import { adminFetch } from '@/lib/adminApi';

interface Organization {
  id: string;
  name: string;
  current_plan: string;
  monthly_audio_hours_limit: number;
  created_at: string;
  updated_at: string;
  members: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
  }[];
  usage?: {
    current_month_minutes: number;
    total_sessions: number;
  };
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const data = await adminFetch('/api/admin/organizations');
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || org.current_plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Organization Management
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {organizations.length} organizations
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by organization name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Team">Team</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </Card>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrganizations.map((org) => (
          <Card key={org.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {org.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                org.current_plan === 'Enterprise' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                org.current_plan === 'Team' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                org.current_plan === 'Professional' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {org.current_plan}
              </span>
            </div>

            {/* Usage Stats */}
            {org.usage && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Usage</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {Math.round(org.usage.current_month_minutes)} / {org.monthly_audio_hours_limit * 60} min
                    </p>
                    <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600"
                        style={{ 
                          width: `${Math.min(100, (org.usage.current_month_minutes / (org.monthly_audio_hours_limit * 60)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {org.usage.total_sessions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Members ({org.members.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {org.members.map((member) => (
                  <div key={member.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-gray-900 dark:text-white">
                        {member.full_name || member.email}
                      </span>
                      {member.full_name && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({member.email})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <a
                href={`/admin/organizations/${org.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View Details →
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}