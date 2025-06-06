'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { adminFetch } from '@/lib/adminApi';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  totalSessions: number;
  totalAudioHours: number;
  revenue: {
    monthly: number;
    total: number;
  };
  usersByPlan: {
    plan: string;
    count: number;
  }[];
  waitlist: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    invited: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const data = await adminFetch('/api/admin/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400">
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardStats();
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Users
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            {stats.totalUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {stats.activeUsers} active today
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Organizations
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            {stats.totalOrganizations.toLocaleString()}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Sessions
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            {stats.totalSessions.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {stats.totalAudioHours.toFixed(1)} audio hours
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Monthly Revenue
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            ${stats.revenue.monthly.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            ${stats.revenue.total.toLocaleString()} total
          </p>
        </Card>
      </div>

      {/* Users by Plan & Waitlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Users by Plan
          </h3>
          <div className="space-y-3">
            {stats.usersByPlan.map((plan) => (
              <div key={plan.plan} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {plan.plan}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {plan.count} users
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Beta Waitlist
            </h3>
            <a
              href="/admin/waitlist"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Manage →
            </a>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Entries
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.waitlist.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Pending Review
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.waitlist.pending}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Approved
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.waitlist.approved}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Invited
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.waitlist.invited}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/users"
            className="px-4 py-2 text-center text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Manage Users
          </a>
          <a
            href="/admin/organizations"
            className="px-4 py-2 text-center text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Manage Organizations
          </a>
          <a
            href="/admin/waitlist"
            className="px-4 py-2 text-center text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
          >
            Manage Waitlist
          </a>
          <a
            href="/admin/system"
            className="px-4 py-2 text-center text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            System Logs
          </a>
        </div>
      </Card>
    </div>
  );
}