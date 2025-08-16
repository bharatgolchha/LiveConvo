'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InviteRedirect() {
  const router = useRouter();
  const params = useParams();
  const token = (params?.token as string) || '';

  useEffect(() => {
    if (!token) return;
    try {
      localStorage.setItem('invite_token', token);
    } catch {}
    router.replace(`/auth/signup?inviteToken=${encodeURIComponent(token)}`);
  }, [token, router]);
  return null;
}