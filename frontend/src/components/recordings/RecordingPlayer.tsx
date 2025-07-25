'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Maximize2, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
// We'll use native input range since Slider component is not available
// We'll use native components since some UI components are not available
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface RecordingPlayerProps {
  recordingUrl: string | null;
  recordingStatus?: string;
  recordingExpiresAt?: string;
  sessionId: string;
  sessionCreatedAt?: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function RecordingPlayer({
  recordingUrl,
  recordingStatus,
  recordingExpiresAt,
  sessionId,
  sessionCreatedAt,
  onTimeUpdate
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { session } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use proxy for S3 URLs to handle CORS issues
  // Use base64 encoding to avoid double-encoding issues with presigned URLs
  const videoUrl = recordingUrl && recordingUrl.includes('amazonaws.com') 
    ? `/api/proxy/recording?url=${btoa(recordingUrl)}`
    : recordingUrl;

  // Debug logging
  useEffect(() => {
    console.log('RecordingPlayer props:', {
      recordingUrl,
      recordingStatus,
      sessionId,
      hasVideoRef: !!videoRef.current,
      urlLength: recordingUrl?.length,
      urlPreview: recordingUrl?.substring(0, 100) + '...'
    });
    
    // Reset loading/error state when URL changes
    if (recordingUrl) {
      setError(null);
      setIsLoading(true);
    }
  }, [recordingUrl, recordingStatus, sessionId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      setDuration(video.duration);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => {
      console.log('Video can play', {
        currentSrc: video.currentSrc,
        duration: video.duration,
        networkState: video.networkState,
        readyState: video.readyState
      });
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      console.error('Video error:', video.error?.message || 'Unknown video error', {
        errorCode: video.error?.code,
        errorMessage: video.error?.message,
        src: video.src,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc,
        recordingUrl: recordingUrl,
        canPlayType: video.canPlayType('video/mp4')
      });
      
      let errorMessage = 'Failed to load recording.';
      if (video.error) {
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted.';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading the recording.';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMessage = 'Error decoding the recording.';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Recording format is not supported or URL is invalid.';
            // Check if this might be a CORS issue or S3 URL issue
            if (recordingUrl?.includes('amazonaws.com')) {
              errorMessage = 'The recording URL has expired. Please click the refresh button above to get a new URL.';
              console.error('S3 URL error - The presigned URL has likely expired.');
            }
            break;
        }
      }
      
      if (recordingUrl?.includes('example.com')) {
        errorMessage = 'This is a placeholder URL. Click the refresh button to fetch the real recording.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl, onTimeUpdate]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById(`recording-player-${sessionId}`);
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!recordingUrl) return;
    
    try {
      // Use proxy URL for download to avoid CORS issues
      // Use base64 encoding to avoid double-encoding issues
      const downloadUrl = recordingUrl.includes('amazonaws.com') 
        ? `/api/proxy/recording?url=${btoa(recordingUrl)}`
        : recordingUrl;
      
      // Fetch the video through the proxy
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download recording');
      
      // Convert to blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `recording-${sessionId}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download recording. Please try again.');
    }
  };

  // We no longer check for expiration since we're always fetching fresh URLs
  const isExpired = false;

  if (recordingStatus === 'processing') {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Recording is being processed...</p>
        </div>
      </Card>
    );
  }

  if (recordingStatus === 'failed' || error) {
    return (
      <Alert variant={error?.includes('expired') ? 'default' : 'destructive'}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Recording failed to process. Please try recording again.'}
          {error?.includes('expired') && (
            <div className="mt-2 text-sm">
              Click the refresh button (↻) above to get a new URL.
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!recordingUrl || isExpired) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isExpired 
            ? 'This recording has expired and is no longer available.' 
            : 'No recording available for this session.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="overflow-hidden" id={`recording-player-${sessionId}`}>
      <div className="relative bg-background">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video"
            preload="metadata"
            playsInline
            controls={false}
            muted={isMuted}
          />
        )}
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="h-9 w-9 p-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <span className="text-sm text-muted-foreground min-w-[45px]">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            value={currentTime}
            max={duration}
            step={1}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            onChange={(e) => handleSeek([parseFloat(e.target.value)])}
            disabled={isLoading || !!error}
          />
          
          <span className="text-sm text-muted-foreground min-w-[45px]">
            {formatTime(duration)}
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              disabled={isLoading || !!error}
              className="h-9 w-9 p-0"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <input
              type="range"
              value={isMuted ? 0 : volume}
              max={1}
              step={0.1}
              className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
              disabled={isLoading || !!error}
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            disabled={isLoading || !!error}
            className="h-9 w-9 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading || !!error}
            title="Download recording"
            className="h-9 w-9 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        
        {sessionCreatedAt && (
          <div className="space-y-1">
            {recordingExpiresAt && !isExpired && (
              <p className="text-xs text-muted-foreground">
                Recording expires on {new Date(recordingExpiresAt).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Recording will be permanently deleted on {new Date(new Date(sessionCreatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}