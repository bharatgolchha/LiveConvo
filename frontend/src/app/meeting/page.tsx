'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MeetingPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to dashboard...</p>
    </div>
  );
}