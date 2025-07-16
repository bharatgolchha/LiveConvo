import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface Summary {
  id: string
  session_id: string
  title: string
  tldr: string | null
  key_decisions: any
  action_items: any
  follow_up_questions: any
  conversation_highlights: any
  structured_notes: string | null
  generation_status: string
  generation_error: string | null
  created_at: string
  updated_at: string
}

export function useSummary(sessionId: string) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { session: authSession } = useAuth()

  useEffect(() => {
    if (!sessionId || !authSession?.access_token) {
      setLoading(false)
      return
    }

    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/sessions/${sessionId}/summary`, {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 404) {
            // No summary exists yet
            setSummary(null)
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch summary')
        }

        const data = await response.json()
        
        // Extract the actual summary from the response
        const summary = data.summary || data
        
        setSummary(summary)
      } catch (err) {
        // Only log non-404 errors
        if (err instanceof Error && !err.message.includes('404')) {
          console.error('Error fetching summary:', err)
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch summary')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [sessionId, authSession?.access_token])

  return { summary, loading, error }
}