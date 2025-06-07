'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [router]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!userData?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    LivePrompt Admin
                  </h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    href="/admin"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Overview
                  </Link>
                  <Link
                    href="/admin/users"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/organizations"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/admin/waitlist"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Waitlist
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/admin/system"
                    className="border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    System
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="py-10">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}