import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { analyzeQueryWithAI } from '@/lib/agents/queryAnalyzer';
import { SearchPlanner, SearchStrategy, SearchPlan } from '@/lib/agents/searchPlanner';
import { z } from 'zod';

// Request schema
const SearchRequestSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().default(20),
  timeoutMs: z.number().default(5000)
});

// Response schema
const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['meeting', 'action_item', 'calendar_event']),
  title: z.string(),
  summary: z.string().optional(),
  date: z.string(),
  participants: z.array(z.string()).optional(),
  relevance: z.object({
    score: z.number(),
    explanation: z.string()
  }),
  metadata: z.record(z.any()).optional()
});

type SearchResult = z.infer<typeof SearchResultSchema>;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { query, maxResults, timeoutMs } = SearchRequestSchema.parse(body);

    // Analyze query
    const analyzedQuery = await analyzeQueryWithAI(query);
    console.log('Analyzed query:', analyzedQuery);

    // Create search plan
    const planner = new SearchPlanner();
    const searchPlan = planner.createSearchPlan(analyzedQuery);
    console.log('Search plan:', searchPlan);

    // Execute search strategies
    const searchResults: SearchResult[] = [];
    const processedIds = new Set<string>();

    for (const strategy of searchPlan.strategies) {
      try {
        const strategyResults = await executeSearchStrategy(
          supabase,
          user.id,
          strategy,
          analyzedQuery,
          planner
        );

        // Add unique results
        for (const result of strategyResults) {
          if (!processedIds.has(result.id)) {
            processedIds.add(result.id);
            searchResults.push(result);
          }
        }

        // Check if we have enough results
        if (searchResults.length >= maxResults) {
          break;
        }
      } catch (error) {
        console.error('Strategy execution error:', error);
        // Continue with next strategy
      }
    }

    // If we don't have enough results and there's a fallback strategy
    if (searchResults.length < 5 && searchPlan.fallbackStrategy) {
      try {
        const fallbackResults = await executeSearchStrategy(
          supabase,
          user.id,
          searchPlan.fallbackStrategy,
          analyzedQuery,
          planner
        );

        for (const result of fallbackResults) {
          if (!processedIds.has(result.id)) {
            processedIds.add(result.id);
            searchResults.push(result);
          }
        }
      } catch (error) {
        console.error('Fallback strategy error:', error);
      }
    }

    // Sort by relevance score
    searchResults.sort((a, b) => b.relevance.score - a.relevance.score);

    // Limit results
    const finalResults = searchResults.slice(0, maxResults);

    return NextResponse.json({
      query: analyzedQuery,
      searchPlan,
      results: finalResults,
      totalFound: searchResults.length,
      executedStrategies: searchPlan.strategies.length
    });

  } catch (error) {
    console.error('Dashboard search API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute search' },
      { status: 500 }
    );
  }
}

// Execute a single search strategy
async function executeSearchStrategy(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  userId: string,
  strategy: SearchStrategy,
  analyzedQuery: Awaited<ReturnType<typeof analyzeQueryWithAI>>,
  planner: SearchPlanner
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  switch (strategy.type) {
    case 'temporal':
    case 'topic':
    case 'entity':
    case 'hybrid':
      // Search meetings/summaries
      const meetingResults = await searchMeetings(supabase, userId, strategy);
      for (const meeting of meetingResults) {
        const relevance = planner.calculateRelevance({
          created_at: meeting.created_at,
          title: meeting.title,
          tldr: meeting.tldr || undefined,
          participant_me: meeting.participant_me,
          participant_them: meeting.participant_them
        }, analyzedQuery, strategy);
        results.push({
          id: `meeting_${meeting.id}`,
          type: 'meeting',
          title: meeting.title || 'Untitled Meeting',
          summary: meeting.tldr || undefined,
          date: meeting.created_at,
          participants: [meeting.participant_me, meeting.participant_them].filter((p): p is string => Boolean(p)),
          relevance: {
            score: relevance.score,
            explanation: relevance.explanation
          },
          metadata: {
            session_id: meeting.session_id,
            key_decisions: meeting.key_decisions,
            action_items: meeting.action_items
          }
        });
      }
      break;

    case 'participant':
      // Special handling for participant-based search
      const participantResults = await searchByParticipants(supabase, userId, strategy);
      for (const meeting of participantResults) {
        const relevance = planner.calculateRelevance({
          created_at: meeting.created_at,
          title: meeting.title,
          tldr: meeting.tldr || undefined,
          participant_me: meeting.participant_me,
          participant_them: meeting.participant_them
        }, analyzedQuery, strategy);
        results.push({
          id: `meeting_${meeting.id}`,
          type: 'meeting',
          title: meeting.title || 'Untitled Meeting',
          summary: meeting.tldr || undefined,
          date: meeting.created_at,
          participants: [meeting.participant_me, meeting.participant_them].filter((p): p is string => Boolean(p)),
          relevance: {
            score: relevance.score,
            explanation: relevance.explanation
          },
          metadata: {
            session_id: meeting.session_id
          }
        });
      }
      break;
  }

  // Also search action items if relevant
  if (analyzedQuery.intent === 'action_items' || 
      strategy.filters.keywords?.some((k: string) => k.toLowerCase().includes('action') || k.toLowerCase().includes('task'))) {
    const actionResults = await searchActionItems(supabase, userId, strategy);
    for (const action of actionResults) {
      const relevance = planner.calculateRelevance(action, analyzedQuery, strategy);
      results.push({
        id: `action_${action.id}`,
        type: 'action_item',
        title: action.text || action.title || 'Untitled Action',
        date: action.created_at,
        relevance: {
          score: relevance.score * 0.9, // Slightly lower weight for action items
          explanation: relevance.explanation
        },
        metadata: {
          status: action.status,
          session_id: action.session_id
        }
      });
    }
  }

  // Search calendar events if looking for schedule
  if (analyzedQuery.intent === 'schedule' || 
      strategy.filters.keywords?.some((k: string) => k.toLowerCase().includes('meeting') || k.toLowerCase().includes('calendar'))) {
    const eventResults = await searchCalendarEvents(supabase, userId, strategy);
    for (const event of eventResults) {
      const relevance = planner.calculateRelevance({
        created_at: event.start_time,
        title: event.title,
        summary: event.description || undefined,
        attendees: event.attendees?.map((a) => a.email || a.name).filter((p): p is string => Boolean(p))
      }, analyzedQuery, strategy);
      results.push({
        id: `event_${event.id}`,
        type: 'calendar_event',
        title: event.title,
        summary: event.description || undefined,
        date: event.start_time,
        participants: event.attendees?.map((a) => a.email || a.name).filter((p): p is string => Boolean(p)),
        relevance: {
          score: relevance.score,
          explanation: relevance.explanation
        },
        metadata: {
          end_time: event.end_time,
          meeting_url: event.meeting_url
        }
      });
    }
  }

  return results;
}

// Search meetings with various filters
async function searchMeetings(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  userId: string,
  strategy: SearchStrategy
): Promise<Array<{
  id: string;
  title: string;
  tldr: string | null;
  key_decisions: string[] | null;
  action_items: string[] | null;
  created_at: string;
  session_id: string;
  participant_me?: string;
  participant_them?: string;
}>> {
  let query = supabase
    .from('summaries')
    .select(`
      *,
      sessions!inner(
        id,
        title,
        created_at,
        participant_me,
        participant_them
      )
    `)
    .eq('user_id', userId)
    .eq('generation_status', 'completed');

  // Apply date filters
  if (strategy.filters.dateRange?.start) {
    query = query.gte('created_at', strategy.filters.dateRange.start + 'T00:00:00');
  }
  if (strategy.filters.dateRange?.end) {
    query = query.lte('created_at', strategy.filters.dateRange.end + 'T23:59:59');
  } else if (strategy.type === 'hybrid' && !strategy.filters.dateRange?.start) {
    // For hybrid searches without date range, search all time
    // This allows finding meetings from any time period
    console.log('🔍 Searching all time periods for hybrid query');
  }

  // Apply limit
  query = query.limit(strategy.limit);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Meeting search error:', error);
    return [];
  }
  
  console.log(`🔍 Found ${data?.length || 0} meetings before keyword filtering`);

  // Filter by keywords in memory (for now)
  if (strategy.filters.keywords && strategy.filters.keywords.length > 0) {
    console.log('🔍 Filtering with keywords:', strategy.filters.keywords);
    
    const filtered = data.filter((meeting: any) => {
      // Include session title in search text
      const sessionTitle = meeting.sessions?.title || '';
      const searchText = `${meeting.title || ''} ${sessionTitle} ${meeting.tldr || ''} ${meeting.key_decisions?.join(' ') || ''} ${meeting.action_items?.join(' ') || ''}`.toLowerCase();
      
      // Check if ALL keywords match (for multi-word searches like "zen sciences")
      const multiWordKeywords = strategy.filters.keywords!.filter(k => k.includes(' '));
      const singleWordKeywords = strategy.filters.keywords!.filter(k => !k.includes(' '));
      
      // Multi-word phrases should match exactly
      const multiWordMatch = multiWordKeywords.length === 0 || 
        multiWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      // At least one single word should match
      const singleWordMatch = singleWordKeywords.length === 0 || 
        singleWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      const matches = multiWordMatch && singleWordMatch;
      
      if (meeting.title?.toLowerCase().includes('zen')) {
        console.log('🎯 Zen meeting found:', {
          title: meeting.title,
          sessionTitle: sessionTitle,
          matches: matches,
          searchText: searchText.substring(0, 200)
        });
      }
      
      return matches;
    });
    
    console.log(`🔍 After keyword filtering: ${filtered.length} meetings`);
    return filtered;
  }

  return data || [];
}

// Search by participants
async function searchByParticipants(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  userId: string,
  strategy: SearchStrategy
): Promise<Array<{
  id: string;
  title: string;
  tldr: string | null;
  key_decisions: string[] | null;
  action_items: string[] | null;
  created_at: string;
  session_id: string;
  participant_me?: string;
  participant_them?: string;
}>> {
  let query = supabase
    .from('sessions')
    .select(`
      *,
      summaries!inner(
        id,
        title,
        tldr,
        key_decisions,
        action_items,
        created_at,
        generation_status
      )
    `)
    .eq('user_id', userId)
    .eq('summaries.generation_status', 'completed');

  // Apply participant filters
  if (strategy.filters.participants && strategy.filters.participants.length > 0) {
    const participantFilters = strategy.filters.participants
      .filter(p => p !== 'self')
      .map(p => `participant_them.ilike.%${p}%`)
      .join(',');
    
    if (participantFilters) {
      query = query.or(participantFilters);
    }
  }

  // Apply date filters
  if (strategy.filters.dateRange?.start) {
    query = query.gte('created_at', strategy.filters.dateRange.start + 'T00:00:00');
  }
  if (strategy.filters.dateRange?.end) {
    query = query.lte('created_at', strategy.filters.dateRange.end + 'T23:59:59');
  }

  query = query.limit(strategy.limit);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Participant search error:', error);
    return [];
  }

  // Transform to match expected format
  return (data || []).map((session: any) => ({
    ...session.summaries,
    session_id: session.id,
    participant_me: session.participant_me,
    participant_them: session.participant_them
  }));
}

// Search action items
async function searchActionItems(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  userId: string,
  strategy: SearchStrategy
): Promise<Array<{
  id: string;
  text: string;
  title?: string;
  status: string;
  created_at: string;
  session_id: string;
}>> {
  let query = supabase
    .from('prep_checklist')
    .select(`
      *,
      sessions!inner(
        id,
        user_id,
        title,
        created_at
      )
    `)
    .eq('sessions.user_id', userId)
    .in('status', ['pending', 'in_progress', 'todo']);

  // Apply date filters on session
  if (strategy.filters.dateRange?.start) {
    query = query.gte('sessions.created_at', strategy.filters.dateRange.start + 'T00:00:00');
  }
  if (strategy.filters.dateRange?.end) {
    query = query.lte('sessions.created_at', strategy.filters.dateRange.end + 'T23:59:59');
  }

  query = query.limit(strategy.limit);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Action items search error:', error);
    return [];
  }

  // Filter by keywords
  if (strategy.filters.keywords && strategy.filters.keywords.length > 0) {
    return (data || []).filter((item: any) => {
      const searchText = `${item.text || ''} ${item.sessions?.title || ''}`.toLowerCase();
      
      // Check if ALL keywords match (for multi-word searches like "zen sciences")
      const multiWordKeywords = strategy.filters.keywords!.filter(k => k.includes(' '));
      const singleWordKeywords = strategy.filters.keywords!.filter(k => !k.includes(' '));
      
      // Multi-word phrases should match exactly
      const multiWordMatch = multiWordKeywords.length === 0 || 
        multiWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      // At least one single word should match
      const singleWordMatch = singleWordKeywords.length === 0 || 
        singleWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      return multiWordMatch && singleWordMatch;
    });
  }

  return data || [];
}

// Search calendar events
async function searchCalendarEvents(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  userId: string,
  strategy: SearchStrategy
): Promise<Array<{
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  attendees?: Array<{ email?: string; name?: string }>;
  meeting_url?: string;
}>> {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      calendar_connections!inner(
        user_id
      )
    `)
    .eq('calendar_connections.user_id', userId);

  // For schedule queries, look forward
  if (strategy.filters.dateRange?.start) {
    query = query.gte('start_time', strategy.filters.dateRange.start + 'T00:00:00');
  } else {
    // Default to current time for schedule queries
    query = query.gte('start_time', new Date().toISOString());
  }

  if (strategy.filters.dateRange?.end) {
    query = query.lte('start_time', strategy.filters.dateRange.end + 'T23:59:59');
  }

  query = query.limit(strategy.limit);
  query = query.order('start_time', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('Calendar events search error:', error);
    return [];
  }

  // Filter by keywords
  if (strategy.filters.keywords && strategy.filters.keywords.length > 0) {
    return (data || []).filter((event: any) => {
      const searchText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
      
      // Check if ALL keywords match (for multi-word searches like "zen sciences")
      const multiWordKeywords = strategy.filters.keywords!.filter(k => k.includes(' '));
      const singleWordKeywords = strategy.filters.keywords!.filter(k => !k.includes(' '));
      
      // Multi-word phrases should match exactly
      const multiWordMatch = multiWordKeywords.length === 0 || 
        multiWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      // At least one single word should match
      const singleWordMatch = singleWordKeywords.length === 0 || 
        singleWordKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      
      return multiWordMatch && singleWordMatch;
    });
  }

  return data || [];
}