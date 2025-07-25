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
  onShare?: (session: Session) => void
}

export const MeetingCardAdapter = React.memo(({
  session,
  selected,
  onSelect,
  onOpen,
  onFollowUp,
  onReport,
  onShare,
}: MeetingCardAdapterProps) => {
  // Only fetch full summary if we don't have a snippet and need detailed data
  const shouldFetchFullSummary = session.status === 'completed' && 
                                 session.recording_duration_seconds && 
                                 session.recording_duration_seconds > 60 && // At least 1 minute of recording
                                 !(session.summaries && session.summaries.length > 0 && session.summaries[0].tldr) // Only fetch if no summary from API
  
  const { summary, loading: summaryLoading } = useSummary(
    shouldFetchFullSummary ? session.id : ''
  )


  // Map session data to MeetingCard props
  const mappedProps = useMemo(() => {
    // Helper to clean and normalise participant names
    const cleanNames = (names: string[] | null | undefined) => {
      if (!Array.isArray(names)) return []
      const uniqueNames = [...new Set(names)] // Remove duplicates
      return uniqueNames
        .filter(name => name && name.trim() && !['me', 'them', 'user', 'other'].includes(name.toLowerCase()))
        .map(name => name.trim())
    }

    // Use aggregated participant data from dashboard API when available
    let finalParticipants: string[] = []
    let participantCount = 0
    
    // Process participants from JSONB data
    if (session.participants && Array.isArray(session.participants)) {
      // Extract names from participants JSONB array
      const participantNames = session.participants
        .map((p: any) => {
          if (typeof p === 'string') return p
          if (typeof p === 'object' && p.name) return p.name
          if (typeof p === 'object' && p.email) return p.email.split('@')[0]
          return null
        })
        .filter(Boolean)
        .map(name => name.trim())
        .filter(name => name.length > 0)
      
      finalParticipants = cleanNames(participantNames)
      participantCount = session.participants.length
    } else {
      // Fallback to existing logic for backwards compatibility
      // Clean participant names from various sources  
      let participantSources = [
        session.participant_me,
        session.participant_them
      ]
      
      // Add transcript speakers if available
      const transcriptSpeakers = session.transcript_speakers
      if (Array.isArray(transcriptSpeakers)) {
        participantSources.push(...transcriptSpeakers)
      }
      
      // Process all sources
      const allNames = participantSources
        .filter(name => name && typeof name === 'string')
        .map(name => name.trim())
        .filter(name => name.length > 0)
      
      finalParticipants = cleanNames(allNames)
      participantCount = finalParticipants.length
    }

    const hasParticipants = participantCount > 0
    
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
      
      // Handle custom types that contain specific keywords
      const lowerType = conversationType.toLowerCase()
      
      // Check for sales-related keywords
      if (lowerType.includes('sales') || lowerType.includes('demo') || lowerType.includes('discovery')) {
        return 'Sales'
      }
      
      // Check for support-related keywords
      if (lowerType.includes('support') || lowerType.includes('help') || lowerType.includes('customer')) {
        return 'Support'
      }
      
      // Check for interview-related keywords
      if (lowerType.includes('interview') || lowerType.includes('candidate')) {
        return 'Interview'
      }
      
      // Check for coaching-related keywords
      if (lowerType.includes('coaching') || lowerType.includes('1:1') || lowerType.includes('one_on_one') || lowerType.includes('mentor')) {
        return 'Coaching'
      }
      
      // Exact type mapping for known types
      const typeMap: Record<string, string> = {
        'sales': 'Sales',
        'sales_call': 'Sales',
        'support': 'Support',
        'team_meeting': 'Team',
        'meeting': 'Team',
        'interview': 'Interview',
        'coaching': 'Coaching',
        'consultation': 'Consultation',
        'training': 'Training',
        'brainstorming': 'Team',
        'demo': 'Sales',
        'standup': 'Team',
        'product_strategy': 'Strategy',
        'strategy': 'Strategy',
        'custom': 'Custom'
      }
      
      // Return exact match if found, otherwise return the original type capitalized
      return typeMap[lowerType] || conversationType.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
    
    // Create TLDR from session summary or context
    const getTldr = (): string | undefined => {
      // participantCount is already calculated above
      const duration = session.recording_duration_seconds || 0
      const hasRecording = duration > 0
      
      // For completed sessions, use the actual TLDR from summaries table
      if (session.status === 'completed') {
        // First, try to use the summary from the joined summaries data
        if (session.summaries && session.summaries.length > 0 && session.summaries[0].tldr) {
          return session.summaries[0].tldr
        }
        
        // If fetching full summary and still loading, show loading state
        if (summaryLoading) {
          return undefined // This will show the loading skeleton
        }
        
        // Use full summary TLDR if available
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
        return `Meeting in progress${activeFor > 0 ? ` for ${activeFor} minute${activeFor === 1 ? '' : 's'}` : ''}.`
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
    
    // Show share button for completed sessions that user owns
    const canShowShare = Boolean(session.status === 'completed' && 
                        session.recording_duration_seconds && 
                        session.recording_duration_seconds > 60 && // At least 1 minute of recording
                        !session.is_shared_with_me) // Don't show share for meetings shared with the user

    // Get the display title
    const displayTitle = session.title || 'Untitled Meeting'
    
    // Get shared by name if applicable
    const sharedByName = session.is_shared_with_me && session.shared_by
      ? (session.shared_by.full_name || session.shared_by.email?.split('@')[0] || 'Someone')
      : undefined

    return {
      id: session.id,
      title: displayTitle,
      meetingType: getMeetingType(session.conversation_type),
      participants: finalParticipants,
      participantMe: session.participant_me,
      participantThem: session.participant_them,
      status: getCardStatus(session.status),
      startTime: session.recording_started_at 
        ? new Date(session.recording_started_at) 
        : new Date(session.created_at), // Use recording start time if available, otherwise creation time
      durationSec: session.recording_duration_seconds || 0,
      tldr: getTldr(),
      selected,
      showFollowUp: canShowFollowUp,
      showReport: canShowReport,
      showShare: canShowShare,
      botStatus: session.recall_bot_status,
      hasParticipants,
      isShared: session.is_shared,
      isSharedWithMe: session.is_shared_with_me,
      sharedByName,
      onSelect,
      onOpen,
      onFollowUp,
      onReport,
      onShare: onShare ? () => onShare(session) : undefined,
    }
  }, [session, selected, onSelect, onOpen, onFollowUp, onReport, onShare, summary, summaryLoading])
  
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