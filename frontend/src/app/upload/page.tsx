'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard?action=upload');
    } else {
      router.replace('/auth/signup?redirect=%2Fdashboard%3Faction%3Dupload');
    }
  }, [user, loading, router]);

  return null;
}




