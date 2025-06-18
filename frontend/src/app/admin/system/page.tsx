'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import { adminFetch } from '@/lib/adminApi';
import dynamic from 'next/dynamic';

interface SystemLog {
  id: string;
  created_at: string;
  level: string;
  context: string;
  message: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

interface SystemHealth {
  database: { status: string; latency: number };
  auth: { status: string };
  storage: { status: string };
  external_services: {
    deepgram: { status: string };
    openrouter: { status: string };
  };
}

const SystemSettingsCard = dynamic(() => import('@/components/admin/SystemSettingsCard'));

export default function AdminSystemPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchSystemData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchSystemData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemData = async () => {
    try {
      const [logsData, healthData] = await Promise.all([
        adminFetch('/api/admin/system/logs'),
        adminFetch('/api/admin/system/health')
      ]);

      setLogs(logsData);
      setHealth(healthData);
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    logLevel === 'all' || log.level === logLevel
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

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
          System Monitoring
        </h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-refresh
            </span>
          </label>
          <button
            onClick={fetchSystemData}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Core Services
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Database</span>
                <span className={`text-sm font-medium ${getStatusColor(health.database.status)}`}>
                  {health.database.status} ({health.database.latency}ms)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Auth</span>
                <span className={`text-sm font-medium ${getStatusColor(health.auth.status)}`}>
                  {health.auth.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Storage</span>
                <span className={`text-sm font-medium ${getStatusColor(health.storage.status)}`}>
                  {health.storage.status}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              External Services
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Deepgram</span>
                <span className={`text-sm font-medium ${getStatusColor(health.external_services.deepgram.status)}`}>
                  {health.external_services.deepgram.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">OpenRouter</span>
                <span className={`text-sm font-medium ${getStatusColor(health.external_services.openrouter.status)}`}>
                  {health.external_services.openrouter.status}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              System Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Error Rate</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  0.02%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900 dark:text-white">Avg Response</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  125ms
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* System Logs */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            System Logs
          </h3>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No logs found
            </p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {log.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {log.context} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* System Settings */}
      <SystemSettingsCard />
    </div>
  );
}