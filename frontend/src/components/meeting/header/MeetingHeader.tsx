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

export function MeetingHeader() {
  const { meeting, botStatus } = useMeetingContext();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!meeting) return null;

  const isActive = botStatus?.status === 'in_call';
  const isCompleted = meeting.status === 'completed';
  const hasUrl = meeting.meetingUrl && meeting.meetingUrl.trim();

  const getPlatformLogo = () => {
    if (!meeting.platform) return null;
    
    const logos = {
      zoom: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/zoom.png',
      google_meet: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/meet.png',
      teams: 'https://ucvfgfbjcrxbzppwjpuu.storage.supabase.co/v1/object/public/images/Logos/teams.png'
    };
    
    return logos[meeting.platform];
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-5 h-5" />;
      case 'dark':
        return <MoonIcon className="w-5 h-5" />;
      case 'system':
        return <ComputerDesktopIcon className="w-5 h-5" />;
      default:
        return <SunIcon className="w-5 h-5" />;
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

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
              <h1 className="text-sm font-semibold text-foreground truncate flex-1">
                {meeting.title}
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
                  {isActive ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 border border-destructive/20 rounded">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-destructive">LIVE</span>
                    </div>
                  ) : isCompleted ? (
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
                
                {/* Bot Control or View Report for mobile */}
                {isCompleted ? (
                  <button
                    onClick={() => router.push(`/report/${meeting?.id}`)}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    title="View meeting report"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">View Report</span>
                  </button>
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
    <header className="min-h-20 px-8 py-4 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm z-50 relative">
      <div className="min-h-[3rem] max-w-full flex items-center justify-between gap-6">
        
        {/* Left Section - Navigation & Meeting Info */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group p-2 sm:p-2.5 hover:bg-muted/80 rounded-xl transition-all duration-200 shrink-0 hover:scale-105"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          
          {/* Meeting Info */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
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
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-xl border border-border/50">
                    {getPlatformLogo() ? (
                      <Image
                        src={getPlatformLogo()!}
                        alt={getPlatformName(meeting.platform)}
                        width={32}
                        height={32}
                        className="w-6 h-6 sm:w-8 sm:h-8"
                      />
                    ) : (
                      <span className="text-2xl">
                        {getPlatformIcon(meeting.platform)}
                      </span>
                    )}
                  </div>
                  {/* Live Recording Indicator */}
                  {isActive && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-background">
                        <div className="w-full h-full bg-red-400 rounded-full animate-ping opacity-75" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Meeting Details */}
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate leading-tight">
                {meeting.title}
              </h1>
              {hasUrl ? (
                <div className="flex items-center gap-2 mt-1">
                  {meeting.platform && !isMobile && (
                    <>
                      <span className="text-sm font-medium text-muted-foreground">
                        {getPlatformName(meeting.platform)} Meeting
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
              className="flex-1 max-w-2xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MeetingSetupPrompt />
            </motion.div>
          ) : (
            <motion.div 
              key="controls"
              className="flex items-center gap-2 sm:gap-6 px-0 sm:px-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Recording Status */}
              <div className="flex items-center">
              {isActive ? (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl shadow-sm">
                  <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm font-semibold text-destructive">
                    LIVE
                  </span>
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary/10 border border-primary/20 rounded-xl shadow-sm">
                  <VideoCameraIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold text-primary">
                    {isMobile ? 'DONE' : 'COMPLETED'}
                  </span>
                  <div className="w-px h-4 bg-primary/30" />
                  <MeetingTimer 
                    isActive={false}
                    isCompleted={isCompleted}
                    meetingDurationSeconds={meeting.recordingDurationSeconds}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/60 border border-border/50 rounded-xl">
                  <VideoCameraIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Ready to Record
                  </span>
                </div>
              )}
            </div>
            
              {/* Bot Control or View Report - Only for desktop */}
              {!isMobile && (
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <button
                      onClick={() => router.push(`/report/${meeting?.id}`)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                      title="View meeting report"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="text-sm">View Report</span>
                    </button>
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
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Theme Toggle - Hidden on mobile */}
          {!isMobile && (
            <button
              onClick={cycleTheme}
              className="group p-2.5 hover:bg-muted/80 rounded-xl transition-all duration-200 hover:scale-105"
              title={`Current theme: ${theme}. Click to cycle themes.`}
            >
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                {getThemeIcon()}
              </div>
            </button>
          )}
          
          {/* Meeting Actions */}
          <div className="flex items-center gap-2">
            <MeetingActions />
          </div>
        </div>
      </div>
    </header>
  );
}