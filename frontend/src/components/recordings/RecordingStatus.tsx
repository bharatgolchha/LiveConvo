'use client';

import React from 'react';
import { Video, VideoOff, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecordingStatusProps {
  status?: string;
  hasUrl?: boolean;
  expiresAt?: string;
}

export function RecordingStatus({ status, hasUrl, expiresAt }: RecordingStatusProps) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  if (!status && !hasUrl) {
    return (
      <Badge variant="secondary" className="gap-1">
        <VideoOff className="h-3 w-3" />
        No Recording
      </Badge>
    );
  }

  if (status === 'processing') {
    return (
      <Badge variant="default" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }

  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }

  if (isExpired) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  if (status === 'done' || hasUrl) {
    return (
      <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600 border-green-500">
        <Video className="h-3 w-3" />
        Available
      </Badge>
    );
  }

  return null;
}