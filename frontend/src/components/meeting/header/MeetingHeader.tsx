import React from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MeetingBotControl } from './MeetingBotControl';
import { MeetingTimer } from './MeetingTimer';
import { MeetingActions } from './MeetingActions';
import { MeetingUrlEditor } from './MeetingUrlEditor';
import { getPlatformIcon, getPlatformName } from '@/lib/meeting/utils/platform-detector';
import { 
  ArrowLeftIcon, 
  VideoCameraIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export function MeetingHeader() {
  const { meeting, botStatus } = useMeetingContext();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const router = useRouter();

  if (!meeting) return null;

  const isActive = botStatus?.status === 'in_call';
  const isCompleted = meeting.status === 'completed';

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

  return (
    <header className="h-20 px-8 py-4 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm z-50 relative">
      <div className="h-full max-w-full flex items-center justify-between gap-6">
        
        {/* Left Section - Navigation & Meeting Info */}
        <div className="flex items-center gap-6 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group p-2.5 hover:bg-muted/80 rounded-xl transition-all duration-200 shrink-0 hover:scale-105"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          
          {/* Meeting Info */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Platform Icon with Status */}
            <div className="relative shrink-0">
              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <span className="text-2xl">
                  {getPlatformIcon(meeting.platform)}
                </span>
              </div>
              {/* Live Recording Indicator */}
              {isActive && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-background">
                    <div className="w-full h-full bg-red-400 rounded-full animate-ping opacity-75" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Meeting Details */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground truncate leading-tight">
                {meeting.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {getPlatformName(meeting.platform)} Meeting
                </span>
                <span className="text-muted-foreground/60">•</span>
                <MeetingUrlEditor />
              </div>
            </div>
          </div>
        </div>

        {/* Center Section - Recording Status & Controls */}
        <div className="flex items-center gap-6 px-6">
          {/* Recording Status */}
          <div className="flex items-center">
            {isActive ? (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    LIVE
                  </span>
                </div>
                <div className="w-px h-4 bg-red-300 dark:bg-red-700" />
                <MeetingTimer 
                  isActive={isActive}
                  isCompleted={isCompleted}
                />
              </div>
            ) : isCompleted ? (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-xl shadow-sm">
                <VideoCameraIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  COMPLETED
                </span>
                <div className="w-px h-4 bg-green-300 dark:bg-green-700" />
                <MeetingTimer 
                  isActive={false}
                  isCompleted={isCompleted}
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
          
          {/* Bot Control - Only show if meeting is not completed */}
          {!isCompleted && <MeetingBotControl />}
        </div>

        {/* Right Section - Theme Toggle & Actions */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            className="group p-2.5 hover:bg-muted/80 rounded-xl transition-all duration-200 hover:scale-105"
            title={`Current theme: ${theme}. Click to cycle themes.`}
          >
            <div className="text-muted-foreground group-hover:text-foreground transition-colors">
              {getThemeIcon()}
            </div>
          </button>
          
          {/* Meeting Actions */}
          <div className="flex items-center gap-2">
            <MeetingActions />
          </div>
        </div>
      </div>
    </header>
  );
}