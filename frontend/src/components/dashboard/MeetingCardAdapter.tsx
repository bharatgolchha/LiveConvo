import React, { useMemo } from 'react'
import { MeetingCard } from '@/components/MeetingCard'
import type { Session } from '@/lib/hooks/useSessions'
import { useSummary } from '@/lib/hooks/useSummary'

interface MeetingCardAdapterProps {
  session: Session
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onOpen: (id: string) => void
  onFollowUp: (id: string) => void
  onReport: (id: string) => void
}

export const MeetingCardAdapter = React.memo(({
  session,
  selected,
  onSelect,
  onOpen,
  onFollowUp,
  onReport,
}: MeetingCardAdapterProps) => {
  // Fetch summary data for completed sessions that likely have summaries
  const shouldFetchSummary = session.status === 'completed' && 
                            session.recording_duration_seconds && 
                            session.recording_duration_seconds > 60 // At least 1 minute of recording
  
  const { summary, loading: summaryLoading } = useSummary(
    shouldFetchSummary ? session.id : ''
  )


  // Map session data to MeetingCard props
  const mappedProps = useMemo(() => {
    // Get first participant as owner, or use fallback
    const participants = session.transcript_speakers && Array.isArray(session.transcript_speakers) 
      ? session.transcript_speakers
          .filter((speaker: string) => speaker && speaker.trim() && !['me', 'them', 'user', 'other'].includes(speaker.toLowerCase()))
          .map((speaker: string) => speaker.trim())
      : []
    
    // If no transcript speakers, fall back to participant_them or create a default
    const finalParticipants = participants.length > 0 
      ? participants 
      : session.participant_them ? [session.participant_them] : []
    
    // Check if participants have actually joined (have transcript data)
    const hasParticipants = participants.length > 0
    
    // Map session status to MeetingCard status
    const getCardStatus = (sessionStatus: Session['status']) => {
      // Check if session needs action (completed but no follow-up created yet)
      const needsAction = sessionStatus === 'completed' && 
                         session.recording_duration_seconds && 
                         session.recording_duration_seconds > 60 && // At least 1 minute
                         !session.linkedConversationsCount && // No follow-ups created
                         summary?.generation_status === 'completed' // Summary is ready
      
      if (needsAction) {
        return 'Action-Needed' as const
      }
      
      switch (sessionStatus) {
        case 'active':
          return 'Live' as const
        case 'completed':
          return 'Done' as const
        case 'archived':
          return 'Done' as const // Archived sessions are treated as done
        case 'draft':
        case 'created':
          return 'Scheduled' as const
        default:
          return 'Scheduled' as const
      }
    }
    
    // Map conversation type to meeting type
    const getMeetingType = (conversationType?: string | null) => {
      if (!conversationType) return 'Team'
      
      const typeMap: Record<string, string> = {
        'sales': 'Sales',
        'sales_call': 'Sales',
        'support': 'Team',
        'team_meeting': 'Team',
        'meeting': 'Team',
        'interview': 'Interview',
        'consultation': 'Team',
        'one_on_one': 'Team',
        'training': 'Team',
        'brainstorming': 'Team',
        'demo': 'Demo',
        'standup': 'Team',
        'custom': 'Team'
      }
      
      return typeMap[conversationType.toLowerCase()] || 'Team'
    }
    
    // Create TLDR from session summary or context
    const getTldr = (): string | undefined => {
      const participantCount = participants.length
      const duration = session.recording_duration_seconds || 0
      const hasRecording = duration > 0
      
      // For completed sessions, use the actual TLDR from summaries table
      if (session.status === 'completed') {
        if (summaryLoading) {
          return undefined // This will show the loading skeleton
        }
        
        if (summary?.tldr) {
          return summary.tldr
        }
        
        // Fallback if no summary TLDR exists
        const durationText = duration > 0 ? ` Duration: ${Math.floor(duration / 60)} minute${Math.floor(duration / 60) === 1 ? '' : 's'}.` : ''
        const participantText = participantCount > 0 ? ` ${participantCount} participant${participantCount === 1 ? '' : 's'}.` : ''
        const wordsText = session.total_words_spoken && session.total_words_spoken > 0 ? ` ${session.total_words_spoken} words spoken.` : ''
        
        return `Meeting completed.${durationText}${participantText}${wordsText} Click to view full report and transcript.`
      }
      
      // For active sessions, show a dynamic message
      if (session.status === 'active') {
        const activeFor = session.recording_started_at 
          ? Math.floor((Date.now() - new Date(session.recording_started_at).getTime()) / 60000)
          : 0
        return `Meeting in progress${activeFor > 0 ? ` for ${activeFor} minute${activeFor === 1 ? '' : 's'}` : ''}. ${participantCount > 0 ? `${participantCount} participant${participantCount === 1 ? '' : 's'} joined.` : 'Waiting for participants.'}`
      }
      
      // For draft/created sessions
      if (session.status === 'draft' || session.status === 'created') {
        return `Meeting scheduled and ready to start. Click to join and begin recording with AI-powered guidance.`
      }
      
      // For archived sessions
      if (session.status === 'archived') {
        return hasRecording ? `Archived meeting with ${Math.floor(duration / 60)} minute${Math.floor(duration / 60) === 1 ? '' : 's'} of recording.` : 'Archived meeting.'
      }
      
      return undefined
    }
    
    // Determine button visibility based on meeting status and summary availability
    const canShowFollowUp = Boolean(session.status === 'completed' && 
                           session.recording_duration_seconds && 
                           session.recording_duration_seconds > 60 && // At least 1 minute of recording
                           summary?.generation_status === 'completed') // Summary is ready
    
    const canShowReport = Boolean(session.status === 'completed' && 
                         session.recording_duration_seconds && 
                         session.recording_duration_seconds > 60 && // At least 1 minute of recording
                         summary?.generation_status === 'completed') // Summary is ready

    return {
      id: session.id,
      title: session.title || 'Untitled Meeting',
      meetingType: getMeetingType(session.conversation_type),
      participants: finalParticipants,
      status: getCardStatus(session.status),
      startTime: session.recording_started_at 
        ? new Date(session.recording_started_at) 
        : new Date(session.created_at), // Use recording start time if available, otherwise creation time
      durationSec: session.recording_duration_seconds || 0,
      tldr: getTldr(),
      selected,
      showFollowUp: canShowFollowUp,
      showReport: canShowReport,
      botStatus: session.recall_bot_status,
      hasParticipants,
      onSelect,
      onOpen,
      onFollowUp,
      onReport,
    }
  }, [session, selected, onSelect, onOpen, onFollowUp, onReport, summary, summaryLoading])
  
  return <MeetingCard {...mappedProps} />
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders for identical data
  return (
    prevProps.session.id === nextProps.session.id &&
    prevProps.session.status === nextProps.session.status &&
    prevProps.session.recall_bot_status === nextProps.session.recall_bot_status &&
    prevProps.session.recording_duration_seconds === nextProps.session.recording_duration_seconds &&
    prevProps.session.updated_at === nextProps.session.updated_at &&
    prevProps.selected === nextProps.selected
  )
})