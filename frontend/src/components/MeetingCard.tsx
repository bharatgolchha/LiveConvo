'use client'

import React, { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Clock, Calendar, MoreVertical, Users, Briefcase, Video, UserCheck, FileText, Bot, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type MeetingCardProps = {
  id: string
  title: string
  meetingType: 'Team' | 'Sales' | 'Demo' | 'Interview' | string
  participants: string[]
  status: 'Scheduled' | 'Live' | 'Done' | 'Action-Needed'
  startTime: Date
  durationSec: number
  tldr?: string
  selected: boolean
  showFollowUp?: boolean
  showReport?: boolean
  botStatus?: 'created' | 'joining' | 'in_call' | 'recording' | 'waiting' | 'permission_denied' | 'completed' | 'failed' | 'timeout' | 'cancelled'
  hasParticipants?: boolean
  onSelect: (id: string, checked: boolean) => void
  onOpen: (id: string) => void
  onFollowUp: (id: string) => void
  onReport: (id: string) => void
}

const meetingTypeIcons = {
  Team: Users,
  Sales: Briefcase,
  Demo: Video,
  Interview: UserCheck,
}

const statusColors = {
  Scheduled: 'bg-muted-foreground',
  Live: 'bg-destructive',
  Done: 'bg-secondary',
  'Action-Needed': 'bg-accent',
}

const statusDotClasses: Record<string, string> = {
  Live: 'animate-ping',
}

export function MeetingCard({
  id,
  title,
  meetingType,
  participants,
  status,
  startTime,
  durationSec,
  tldr,
  selected,
  showFollowUp = false,
  showReport = false,
  botStatus,
  hasParticipants = false,
  onSelect,
  onOpen,
  onFollowUp,
  onReport,
}: MeetingCardProps) {
  const [tldrExpanded, setTldrExpanded] = useState(false)

  // Helper function to get participant initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return '?'
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase()
    }
    return words.map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase()
  }

  // Helper function to get avatar color (consistent colors for each participant)
  const getAvatarColor = (participant: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ]
    const index = participant.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  // Process participants for display
  const maxDisplayParticipants = 3
  const displayParticipants = participants.slice(0, maxDisplayParticipants)
  const remainingCount = Math.max(0, participants.length - maxDisplayParticipants)

  // Helper function to get bot status display
  const getBotStatusDisplay = () => {
    if (!botStatus) return null
    
    switch (botStatus) {
      case 'recording':
        return { icon: Bot, text: 'Bot Recording', color: 'text-green-600 dark:text-green-400' }
      case 'in_call':
        return { icon: Bot, text: 'Bot Joined', color: 'text-blue-600 dark:text-blue-400' }
      case 'joining':
        return { icon: Bot, text: 'Bot Joining', color: 'text-yellow-600 dark:text-yellow-400' }
      case 'waiting':
        return { icon: Bot, text: 'Bot Waiting', color: 'text-gray-600 dark:text-gray-400' }
      case 'failed':
      case 'permission_denied':
        return { icon: Bot, text: 'Bot Failed', color: 'text-red-600 dark:text-red-400' }
      default:
        return null
    }
  }

  const botStatusDisplay = getBotStatusDisplay()

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const getRelativeTime = () => {
    const now = new Date()
    const diffMs = now.getTime() - startTime.getTime()
    
    if (diffMs < 0) {
      return `in ${formatDistanceToNow(startTime)}`
    }
    return `${formatDistanceToNow(startTime)} ago`
  }

  const Icon = meetingTypeIcons[meetingType as keyof typeof meetingTypeIcons] || Calendar

  return (
    <div
      role="group"
      className={cn(
        'rounded-2xl shadow-sm hover:shadow-md transition-all duration-300',
        'bg-card border border-border',
        'hover:border-primary/50 hover:translate-y-[-1px]',
        'px-4 py-3',
        selected && 'border-l-4 border-l-primary',
        'grid grid-cols-[auto_1fr_auto] gap-3 sm:gap-4',
        'sm:grid-areas-[left_body_right] grid-areas-[left_body_right]'
      )}
    >
      {/* Left Rail - Desktop */}
      <div className="hidden sm:flex w-12 flex-col items-center justify-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(id, checked as boolean)}
          aria-label={`Select ${title}`}
          className="mt-0.5"
        />
        <div className="relative">
          <div className={cn(
            'w-2 h-2 rounded-full',
            statusColors[status],
            statusDotClasses[status] || ''
          )} />
          {status === 'Live' && (
            <div className={cn(
              'absolute inset-0 w-2 h-2 rounded-full',
              'bg-destructive',
              'animate-ping'
            )} />
          )}
        </div>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Mobile Header - Checkbox and Status */}
      <div className="flex sm:hidden items-center gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(id, checked as boolean)}
          aria-label={`Select ${title}`}
        />
        <div className="relative">
          <div className={cn(
            'w-2 h-2 rounded-full',
            statusColors[status],
            statusDotClasses[status] || ''
          )} />
          {status === 'Live' && (
            <div className={cn(
              'absolute inset-0 w-2 h-2 rounded-full',
              'bg-destructive',
              'animate-ping'
            )} />
          )}
        </div>
      </div>

      {/* Body */}
      <div 
        className="flex flex-col gap-1 min-w-0 cursor-pointer"
        onClick={() => onOpen(id)}
      >
        <h3 className="font-semibold text-base truncate text-foreground">{title}</h3>
        
        {/* Mobile relative time */}
        <p className="sm:hidden text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <time dateTime={startTime.toISOString()}>{getRelativeTime()}</time>
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {meetingType}
          </span>
          <div className="flex items-center gap-1">
            {/* Participant Avatars */}
            <div className="flex items-center -space-x-1">
              {displayParticipants.map((participant: string, index: number) => (
                <div
                  key={`${participant}-${index}`}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center border-2 border-background relative',
                    getAvatarColor(participant)
                  )}
                  title={participant}
                >
                  <span className="text-xs font-medium text-white">
                    {getInitials(participant)}
                  </span>
                </div>
              ))}
              
              {/* +X More indicator */}
              {remainingCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-background text-xs font-medium text-muted-foreground">
                  +{remainingCount}
                </div>
              )}
            </div>
            
            {/* Participant names */}
            <span className="text-muted-foreground text-sm">
              {participants.length > 0 
                ? participants.length === 1 
                  ? participants[0]
                  : `${participants.length} participants`
                : 'No participants'
              }
            </span>
          </div>
          <span className="text-muted-foreground">• {formatDuration(durationSec)}</span>
        </div>

        {/* Bot and Participant Status - Only show for Live meetings */}
        {status === 'Live' && (botStatusDisplay || hasParticipants) && (
          <div className="flex items-center gap-3 mt-2">
            {/* Bot Status */}
            {botStatusDisplay && (
              <div className={cn('flex items-center gap-1 text-xs', botStatusDisplay.color)}>
                <botStatusDisplay.icon className="w-3 h-3" />
                <span>{botStatusDisplay.text}</span>
              </div>
            )}
            
            {/* Participant Status */}
            {hasParticipants && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <UserPlus className="w-3 h-3" />
                <span>Participants Joined</span>
              </div>
            )}
          </div>
        )}

        {/* TLDR */}
        <div className="mt-2">
          {tldr === undefined ? (
            <div className="animate-pulse h-4 bg-muted rounded w-3/4" />
          ) : (
            <div className="relative">
              <p
                className={cn(
                  'text-sm text-muted-foreground leading-5',
                  !tldrExpanded && 'line-clamp-3 overflow-hidden'
                )}
              >
                {tldr}
              </p>
              {tldr.length > 150 && (
                <>
                  {!tldrExpanded && (
                    <div className="absolute inset-x-0 bottom-6 h-5 bg-gradient-to-b from-transparent to-card pointer-events-none" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setTldrExpanded(!tldrExpanded)
                    }}
                    className="text-xs text-primary hover:text-primary/80 mt-1 relative z-10 cursor-pointer"
                  >
                    {tldrExpanded ? 'Show less' : 'Show more'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile action buttons */}
        <div className="sm:hidden flex gap-2 mt-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation()
              onOpen(id)
            }}
            aria-label={`Open meeting ${title}`}
          >
            Open
          </Button>
          {showFollowUp && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onFollowUp(id)
              }}
              aria-label={`Follow up on ${title}`}
            >
              Follow-up
            </Button>
          )}
          {showReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onReport(id)
              }}
              aria-label={`View report for ${title}`}
              className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
            >
              <FileText className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Rail - Desktop */}
      <div className="hidden sm:flex flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <time dateTime={startTime.toISOString()}>{getRelativeTime()}</time>
        </div>
        
        {(selected || status === 'Action-Needed') && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            selected && 'bg-primary/10 text-primary',
            status === 'Action-Needed' && 'bg-accent/10 text-accent'
          )}>
            {selected ? 'Selected' : 'Action Needed'}
          </span>
        )}

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation()
              onOpen(id)
            }}
            aria-label={`Open meeting ${title}`}
          >
            Open
          </Button>
          {showFollowUp && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onFollowUp(id)
              }}
              aria-label={`Follow up on ${title}`}
            >
              Follow-up
            </Button>
          )}
          {showReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onReport(id)
              }}
              aria-label={`View report for ${title}`}
              className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
            >
              <FileText className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}