import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { MeetingBotControl } from './MeetingBotControl';
import { MeetingTimer } from './MeetingTimer';
import { MeetingActions } from './MeetingActions';
import { MeetingUrlEditor } from './MeetingUrlEditor';
import { MeetingSetupPrompt } from './MeetingSetupPrompt';
import { BotMinutesIndicator } from './BotMinutesIndicator';
import { getPlatformIcon, getPlatformName } from '@/lib/meeting/utils/platform-detector';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftIcon, 
  VideoCameraIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export function MeetingHeader() {
  const { meeting, botStatus, setMeeting } = useMeetingContext();
  const { session: authSession } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!meeting) return null;

  // Determine meeting state based on both bot status and meeting status
  const isActive = botStatus?.status === 'in_call' || botStatus?.detailedStatus === 'recording';
  const isCompleted = meeting.status === 'completed' || botStatus?.status === 'completed';
  
  // If bot status is null but meeting is completed, it's completed
  // If bot status is null and meeting is not completed, it's ready to start
  const finalIsActive = botStatus === null ? false : isActive;
  const finalIsCompleted = botStatus === null ? meeting.status === 'completed' : isCompleted;
  const isReportReady = finalIsCompleted && !!meeting.finalizedAt;
  const isGeneratingReport = finalIsCompleted && !meeting.finalizedAt;
  const hasUrl = meeting.meetingUrl && meeting.meetingUrl.trim();

  // Poll every 5 s while report is generating, as a fallback in case realtime update misses.
  React.useEffect(() => {
    if (!isGeneratingReport) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authSession?.access_token) {
          headers['Authorization'] = `Bearer ${authSession.access_token}`;
        }

        const res = await fetch(`/api/meeting/${meeting.id}`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const finalizedAt = data?.meeting?.finalized_at;
        const status = data?.meeting?.status;
        if (finalizedAt && !cancelled) {
          setMeeting({
            ...meeting,
            finalizedAt,
            status: status || meeting.status
          });
        }
      } catch (_) {}
    };

    poll(); // immediate
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGeneratingReport, meeting.id, meeting, setMeeting, authSession?.access_token]);

  const getPlatformLogo = () => {
    if (!meeting.platform) return null;
    
    const logos = {
      zoom: '/platform-logos/zoom.png',
      google_meet: '/platform-logos/meet.png',
      teams: '/platform-logos/teams.png'
    };
    
    return logos[meeting.platform];
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-4 h-4" />;
      case 'dark':
        return <MoonIcon className="w-4 h-4" />;
      case 'system':
        return <ComputerDesktopIcon className="w-4 h-4" />;
      default:
        return <SunIcon className="w-4 h-4" />;
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const [retrying, setRetrying] = React.useState(false);

  const triggerFinalize = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) headers['Authorization'] = `Bearer ${authSession.access_token}`;
      await fetch(`/api/sessions/${meeting.id}/finalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ regenerate: true })
      });
    } catch (e) {
      console.error('Retry finalization failed', e);
    } finally {
      setTimeout(() => setRetrying(false), 5000); // prevent spam
    }
  };

  const GeneratingStatus: React.FC<{ onRetry: () => void; compact?: boolean }> = ({ onRetry, compact }) => (
    <div className={compact ? "flex items-center gap-1 px-2 py-1 bg-muted/40 rounded" : "flex items-center gap-2 text-muted-foreground"}>
      <div className={compact ? "w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" : "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"} />
      <span className={compact ? "text-xs font-medium text-muted-foreground" : "text-sm"}>Generating…</span>
      <button onClick={onRetry} disabled={retrying} className="text-primary underline text-xs ml-1 disabled:opacity-50">
        Retry
      </button>
    </div>
  );

  // Mobile-first header design
  if (isMobile) {
    return (
      <header className="min-h-14 px-3 py-2 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm z-50 relative">
        {/* Mobile Layout - Stack vertically */}
        <div className="flex flex-col gap-2">
          {/* Top Row - Back, Title, Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Back Button */}
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 hover:bg-muted/80 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
              </button>
              
              {/* Meeting Title */}
              <h1 className="text-sm font-semibold text-foreground truncate flex-1 flex items-center gap-2">
                {meeting.title.includes('Engagement with Liveprompt.ai') && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Auto
                  </Badge>
                )}
                <span className="truncate">{meeting.title}</span>
              </h1>
            </div>
            
            {/* Actions - includes End Meeting button */}
            <div className="flex-shrink-0">
              <MeetingActions />
            </div>
          </div>
          
          {/* Bottom Row - Status or Setup */}
          {!hasUrl ? (
            <div className="px-1">
              <MeetingSetupPrompt />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Meeting URL */}
              <div className="px-1">
                <MeetingUrlEditor />
              </div>
              
              {/* Status Row */}
              <div className="flex items-center justify-between px-1">
                {/* Platform & Status */}
                <div className="flex items-center gap-2">
                  {meeting.platform && (
                    <div className="p-1 bg-muted/50 rounded">
                      {getPlatformLogo() ? (
                        <Image
                          src={getPlatformLogo()!}
                          alt={getPlatformName(meeting.platform)}
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      ) : (
                        <span className="text-xs">
                          {getPlatformIcon(meeting.platform)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Recording Status */}
                  {finalIsActive ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 border border-destructive/20 rounded">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-destructive">LIVE</span>
                    </div>
                  ) : finalIsCompleted ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded">
                      <VideoCameraIcon className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">DONE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted/60 border border-border/50 rounded">
                      <VideoCameraIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Ready</span>
                    </div>
                  )}
                </div>
                
                {/* Bot Control / Report status (mobile) */}
                {isReportReady ? (
                  <button
                    onClick={() => router.push(`/report/${meeting?.id}`)}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    title="View meeting report"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">View Report</span>
                  </button>
                ) : isGeneratingReport ? (
                  <GeneratingStatus onRetry={() => triggerFinalize()} compact />
                ) : (
                  <MeetingBotControl />
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // Desktop Layout
  return (
    <header className="px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm z-50 relative">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Section - Navigation & Meeting Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group p-1.5 hover:bg-muted/80 rounded-lg transition-all duration-200 shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          
          {/* Meeting Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Platform Icon with Status - Only show if URL exists */}
            <AnimatePresence mode="wait">
              {hasUrl && (
                <motion.div 
                  className="relative shrink-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-1.5 bg-muted/50 rounded-lg border border-border/50">
                    {getPlatformLogo() ? (
                      <Image
                        src={getPlatformLogo()!}
                        alt={getPlatformName(meeting.platform)}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    ) : (
                      <span className="text-lg">
                        {getPlatformIcon(meeting.platform)}
                      </span>
                    )}
                  </div>
                  {/* Live Recording Indicator */}
                  {finalIsActive && (
                    <div className="absolute -top-0.5 -right-0.5">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-background">
                        <div className="w-full h-full bg-red-400 rounded-full animate-ping opacity-75" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Meeting Details */}
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-foreground truncate flex items-center gap-2">
                {meeting.title.includes('Engagement with Liveprompt.ai') && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    Auto
                  </Badge>
                )}
                <span className="truncate">{meeting.title}</span>
              </h1>
              {hasUrl ? (
                <div className="flex items-center gap-2">
                  {meeting.platform && !isMobile && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {getPlatformName(meeting.platform)}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                    </>
                  )}
                  <MeetingUrlEditor />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Center Section - Recording Status & Controls or Setup Prompt */}
        <AnimatePresence mode="wait">
          {!hasUrl ? (
            <motion.div 
              key="setup"
              className="flex-1 max-w-xl"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <MeetingSetupPrompt />
            </motion.div>
          ) : (
            <motion.div 
              key="controls"
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {/* Recording Status */}
              <div className="flex items-center">
                {finalIsActive ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-destructive">LIVE</span>
                  </div>
                ) : finalIsCompleted ? (
                  <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md">
                    <VideoCameraIcon className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">COMPLETED</span>
                    <div className="w-px h-3 bg-primary/30" />
                    <MeetingTimer 
                      isActive={false}
                      isCompleted={finalIsCompleted}
                      meetingDurationSeconds={meeting.recordingDurationSeconds}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted/60 border border-border/50 rounded-md">
                    <VideoCameraIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Ready</span>
                  </div>
                )}
              </div>
            
              {/* Bot Control or View Report - Only for desktop */}
              {!isMobile && (
                <div className="flex items-center gap-2">
                  {isReportReady ? (
                    <button
                      onClick={() => router.push(`/report/${meeting?.id}`)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-medium hover:scale-105"
                      title="View meeting report"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="text-sm">View Report</span>
                    </button>
                  ) : isGeneratingReport ? (
                    <GeneratingStatus onRetry={() => triggerFinalize()} />
                  ) : (
                    <>
                      <BotMinutesIndicator compact />
                      <MeetingBotControl />
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Section - Theme Toggle & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle - Hidden on mobile */}
          {!isMobile && (
            <button
              onClick={cycleTheme}
              className="group p-1.5 hover:bg-muted/80 rounded-lg transition-all duration-200"
              title={`Current theme: ${theme}. Click to cycle themes.`}
            >
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                {getThemeIcon()}
              </div>
            </button>
          )}
          
          {/* Meeting Actions */}
          <div className="flex items-center gap-1">
            <MeetingActions />
          </div>
        </div>
      </div>
    </header>
  );
}