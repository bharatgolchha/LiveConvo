'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';
import { adminFetch } from '@/lib/adminApi';

interface AnalyticsData {
  userGrowth: {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[];
  sessionMetrics: {
    date: string;
    sessions: number;
    audioMinutes: number;
  }[];
  planDistribution: {
    plan: string;
    count: number;
    percentage: number;
  }[];
  topUsers: {
    id: string;
    email: string;
    organization: string;
    sessions: number;
    audioMinutes: number;
  }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const fetchAnalytics = async () => {
    try {
      const data = await adminFetch(`/api/admin/analytics?range=${timeRange}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400">
        Failed to load analytics data
      </div>
    );
  }

  const maxNewUsers = Math.max(0, ...analytics.userGrowth.map(d => d.newUsers)) || 1;
  const maxSessions = Math.max(0, ...analytics.sessionMetrics.map(d => d.sessions)) || 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="quarter">Last 90 days</option>
        </select>
      </div>

      {/* User Growth Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          User Growth
        </h3>
        <div className="space-y-4">
          {analytics.userGrowth.map((day, index) => (
            <div key={day.date} className="flex items-center">
              <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(day.date), 'MMM d')}
              </div>
              <div className="flex-1 flex items-center gap-4">
                <div className="h-8 bg-blue-500 dark:bg-blue-600 rounded" 
                     style={{ width: `${(day.newUsers / maxNewUsers) * 100}%` }}
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  +{day.newUsers} users
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: {day.totalUsers}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Session Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Session Activity
        </h3>
        <div className="space-y-4">
          {analytics.sessionMetrics.map((day) => (
            <div key={day.date} className="flex items-center">
              <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(day.date), 'MMM d')}
              </div>
              <div className="flex-1 flex items-center gap-4">
                <div className="h-8 bg-green-500 dark:bg-green-600 rounded" 
                     style={{ width: `${(day.sessions / maxSessions) * 100}%` }}
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {day.sessions} sessions ({Math.round(day.audioMinutes)} min)
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Plan Distribution
          </h3>
          <div className="space-y-3">
            {analytics.planDistribution.map((plan) => (
              <div key={plan.plan}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {plan.plan}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.count} ({plan.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      plan.plan === 'Enterprise' ? 'bg-purple-600' :
                      plan.plan === 'Team' ? 'bg-blue-600' :
                      plan.plan === 'Professional' ? 'bg-green-600' :
                      'bg-gray-600'
                    }`}
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Users */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top Active Users
          </h3>
          <div className="space-y-3">
            {analytics.topUsers.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">No activity in selected range</div>
            ) : (
              analytics.topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.organization}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.sessions} sessions
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(user.audioMinutes)} min
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}