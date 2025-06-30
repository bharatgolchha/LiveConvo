'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'meeting_starting' | 'bot_deployed' | 'bot_in_call' | 'bot_failed' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  action_url?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 10000);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbNotifications } = await supabase
        .from('meeting_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (dbNotifications && dbNotifications.length > 0) {
        const mappedNotifications = dbNotifications.map(n => ({
          id: n.id,
          type: n.notification_type as Notification['type'],
          title: n.title,
          message: n.message,
          action_url: n.action_url,
          timestamp: new Date(n.created_at),
          read: n.read
        }));

        setNotifications(prev => [...mappedNotifications, ...prev]);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationToasts notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationToasts({ 
  notifications, 
  onDismiss 
}: { 
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  const recentNotifications = notifications
    .filter(n => !n.read)
    .slice(0, 3);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {recentNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-full ${
                notification.type === 'bot_failed' || notification.type === 'error' 
                  ? 'bg-red-100 dark:bg-red-900/20' 
                  : notification.type === 'success' || notification.type === 'bot_in_call'
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : 'bg-blue-100 dark:bg-blue-900/20'
              }`}>
                {notification.type === 'bot_failed' || notification.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : notification.type === 'success' || notification.type === 'bot_in_call' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>
                {notification.action_url && (
                  <a
                    href={notification.action_url}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
                  >
                    View Details →
                  </a>
                )}
              </div>
              
              <button
                onClick={() => onDismiss(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}