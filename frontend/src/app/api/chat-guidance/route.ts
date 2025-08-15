import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';
import { analyzeQuery } from '@/lib/agents/queryAnalyzer';

// Helper function to format dates in a human-readable way
function formatMeetingDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'No date';
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    // Format as "January 24, 2025"
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

// Fallback chips for when AI generation fails
const getFallbackChips = (conversationType: string, stage: string) => {
  const chipMap: Record<string, Record<string, Array<{text: string, prompt: string, impact: number}>>> = {
    sales: {
      opening: [
        { text: "🎯 Set call agenda", prompt: "How should I structure this sales call to maximize engagement?", impact: 90 },
        { text: "🤝 Build rapport", prompt: "What's the best way to build trust with this prospect?", impact: 85 },
        { text: "📋 Qualify prospect", prompt: "What qualifying questions should I ask first?", impact: 80 }
      ],
      discovery: [
        { text: "🔍 Dig deeper", prompt: "What follow-up questions will uncover their real pain points?", impact: 90 },
        { text: "💰 Explore budget", prompt: "How can I tactfully understand their budget parameters?", impact: 85 },
        { text: "⏰ Timeline check", prompt: "What should I ask about their decision timeline?", impact: 80 }
      ],
      discussion: [
        { text: "💡 Present solution", prompt: "How should I position our solution for their specific needs?", impact: 90 },
        { text: "🛡️ Handle objections", prompt: "What's the best way to address their main concerns?", impact: 85 },
        { text: "📊 Show ROI", prompt: "What value examples will resonate most with them?", impact: 80 }
      ],
      closing: [
        { text: "🎯 Close the deal", prompt: "What closing technique should I use right now?", impact: 90 },
        { text: "📅 Set next steps", prompt: "How do I establish clear next steps and commitments?", impact: 85 },
        { text: "📋 Follow-up plan", prompt: "What follow-up should I propose to keep momentum?", impact: 80 }
      ]
    },
    meeting: {
      opening: [
        { text: "📋 Set agenda", prompt: "How should I structure this meeting for maximum productivity?", impact: 90 },
        { text: "🎯 Clarify objectives", prompt: "How can I ensure everyone understands our goals?", impact: 85 },
        { text: "⏰ Manage time", prompt: "What's the best way to keep us on track time-wise?", impact: 80 }
      ],
      discovery: [
        { text: "💭 Gather input", prompt: "How can I encourage more participation from everyone?", impact: 90 },
        { text: "🔍 Explore topics", prompt: "What questions will help us dive deeper into this issue?", impact: 85 },
        { text: "📝 Capture insights", prompt: "What key points should I be documenting right now?", impact: 80 }
      ],
      discussion: [
        { text: "⚖️ Facilitate decisions", prompt: "How can I help the group reach a clear decision?", impact: 90 },
        { text: "🎯 Stay focused", prompt: "How do I redirect the conversation back to our main topic?", impact: 85 },
        { text: "👥 Include everyone", prompt: "How can I make sure all voices are being heard?", impact: 80 }
      ],
      closing: [
        { text: "📋 Summarize actions", prompt: "What action items should I confirm before we end?", impact: 90 },
        { text: "📅 Schedule follow-up", prompt: "What follow-up meetings or check-ins do we need?", impact: 85 },
        { text: "📤 Share summary", prompt: "How should I distribute the meeting notes and next steps?", impact: 80 }
      ]
    },
    interview: {
      opening: [
        { text: "🤝 Make connection", prompt: "How can I make a strong first impression in this interview?", impact: 90 },
        { text: "📋 Understand role", prompt: "What should I ask to better understand the position?", impact: 85 },
        { text: "🏢 Learn about company", prompt: "What questions will show my genuine interest in their company?", impact: 80 }
      ],
      discovery: [
        { text: "💼 Showcase experience", prompt: "How should I present my relevant experience for this role?", impact: 90 },
        { text: "🎯 Align with needs", prompt: "How can I connect my skills to their specific challenges?", impact: 85 },
        { text: "❓ Ask smart questions", prompt: "What thoughtful questions should I ask about the team or role?", impact: 80 }
      ],
      discussion: [
        { text: "💡 Share examples", prompt: "What specific examples best demonstrate my capabilities?", impact: 90 },
        { text: "🤔 Address concerns", prompt: "How should I handle any concerns they might have?", impact: 85 },
        { text: "🎯 Show cultural fit", prompt: "How can I demonstrate I'd be a good cultural fit?", impact: 80 }
      ],
      closing: [
        { text: "📅 Next steps", prompt: "What should I ask about the next steps in their process?", impact: 90 },
        { text: "📞 Follow-up plan", prompt: "How should I follow up after this interview?", impact: 85 },
        { text: "🙏 Express interest", prompt: "What's the best way to express my continued interest?", impact: 80 }
      ]
    }
  };

  return chipMap[conversationType]?.[stage] || chipMap.meeting[stage] || [
    { text: "🎯 Focus discussion", prompt: "How can I keep this conversation productive and on-track?", impact: 85 },
    { text: "🤝 Build rapport", prompt: "What's the best way to strengthen our connection?", impact: 80 },
    { text: "📋 Clarify next steps", prompt: "What should we establish as our next steps?", impact: 75 }
  ];
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'auto-guidance';
  content: string;
  timestamp: Date | string; // Allow both Date objects and ISO strings
  metadata?: {
    confidence?: number;
    guidanceType?: string;
    isResponse?: boolean;
  };
}

interface ChatRequest {
  message: string;
  transcript: string;
  chatHistory: ChatMessage[];
  conversationType?: string;
  sessionId?: string;
  // Enhanced context
  textContext?: string;
  conversationTitle?: string;
  summary?: {
    tldr?: string;
    key_points?: string[];
    sentiment?: string;
  };

  uploadedFiles?: Array<{ name: string; type: string; size: number }>;
  selectedPreviousConversations?: string[];
  personalContext?: string;
  participantMe?: string;
  participantThem?: string;
  smartNotes?: Array<{ category?: string; content?: string; text?: string; importance?: string }>;
  fileAttachments?: Array<{
    type: 'image' | 'pdf';
    dataUrl: string;
    filename: string;
  }>;
  sessionOwner?: {
    id: string;
    email: string;
    fullName: string | null;
    personalContext: string | null;
  };
  
  // Dashboard mode
  mode?: 'meeting' | 'dashboard';
  dashboardContext?: {
    recentMeetings: Array<{
      id: string;
      title: string;
      created_at: string;
      summary: string | null;
      decisions: string[] | null;
      actionItems: string[] | null;
      url?: string;
    }>;
    actionItems: Array<{
      id: string;
      title: string;
      status: string;
      priority: string | null;
      dueDate: string | null;
      sessionId: string;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      description: string | null;
    }>;
  };
}

// Add interface for parsed context
interface ParsedContext {
  conversationType?: string;
  conversationTitle?: string;
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    // Basic server-side rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
    const now = new Date();
    const minuteWindow = new Date(now.getTime());
    minuteWindow.setMinutes(minuteWindow.getMinutes() - 1);
    const dayWindow = new Date(now.getTime());
    dayWindow.setDate(dayWindow.getDate() - 1);

    // Limits: 15/minute, 500/day per IP/auth grouping
    const MINUTE_LIMIT = 15;
    const DAY_LIMIT = 500;

    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: { user } } = await supabase.auth.getUser();
        const rateKey = user?.id ? `chat:user:${user.id}` : `chat:ip:${clientIp}`;
        // Fetch current counters
        const { data: existing } = await supabase
          .from('api_rate_limits')
          .select('key, period, window_start, count')
          .eq('key', rateKey);

        const byPeriod: Record<string, { window_start: string; count: number }> = {};
        (existing || []).forEach((row: any) => { byPeriod[row.period] = { window_start: row.window_start, count: row.count }; });

        // Minute window logic
        const minuteRow = byPeriod['minute'];
        const minuteReset = !minuteRow || new Date(minuteRow.window_start) < minuteWindow;
        const minuteCount = minuteReset ? 0 : (minuteRow.count || 0);
        if (minuteCount >= MINUTE_LIMIT) {
          return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
        }

        // Day window logic
        const dayRow = byPeriod['day'];
        const dayReset = !dayRow || new Date(dayRow.window_start) < dayWindow;
        const dayCount = dayReset ? 0 : (dayRow.count || 0);
        if (dayCount >= DAY_LIMIT) {
          return NextResponse.json({ error: 'Daily rate limit exceeded. Please try again tomorrow.' }, { status: 429 });
        }

        // Increment counters
        const upserts = [
          { key: rateKey, period: 'minute', window_start: minuteReset ? now.toISOString() : (minuteRow?.window_start || now.toISOString()), count: minuteCount + 1 },
          { key: rateKey, period: 'day', window_start: dayReset ? now.toISOString() : (dayRow?.window_start || now.toISOString()), count: dayCount + 1 }
        ];
        await supabase.from('api_rate_limits').upsert(upserts, { onConflict: 'key,period' });
      }
    } catch (e) {
      // If RL storage fails, do not block; continue
      console.warn('Rate limit storage error:', e);
    }
    const body = await request.json();
    const streamMode = Boolean((body as any)?.stream);
    
    // Validate body
    const BodySchema = z.object({
      message: z.string(),
      transcript: z.string().default(''),
      chatHistory: z.array(z.object({
        id: z.string(),
        type: z.enum(['user', 'ai', 'system', 'auto-guidance']),
        content: z.string(),
        timestamp: z.union([z.date(), z.string()]),
        metadata: z.object({
          confidence: z.number().optional(),
          guidanceType: z.string().optional(),
          isResponse: z.boolean().optional()
        }).optional()
      })).default([]),
      conversationType: z.string().optional(),
      sessionId: z.string().optional(),
      textContext: z.string().nullable().optional(),
      conversationTitle: z.string().nullable().optional(),
      meetingUrl: z.string().nullable().optional().default(''),
      summary: z.object({
        tldr: z.string().optional(),
        key_points: z.array(z.string()).optional(),
        sentiment: z.string().optional()
      }).optional(),
      uploadedFiles: z.array(z.object({
        name: z.string(),
        type: z.string(),
        size: z.number()
      })).optional(),
      selectedPreviousConversations: z.array(z.string()).optional(),
      personalContext: z.string().nullable().optional(),
      participantMe: z.string().optional(),
      participantThem: z.string().optional(),
      smartNotes: z.array(z.object({
        category: z.string().optional(),
        content: z.string().optional(),
        text: z.string().optional(),
        importance: z.string().optional()
      })).optional(),
      fileAttachments: z.array(z.object({
        type: z.enum(['image', 'pdf']),
        dataUrl: z.string(),
        filename: z.string()
      })).optional(),
      stage: z.enum(['opening','discovery','demo','pricing','closing','discussion']).optional(),
      isRecording: z.boolean().optional(),
      transcriptLength: z.number().optional(),
      sessionOwner: z.object({
        id: z.string(),
        email: z.string(),
        fullName: z.string().nullable(),
        personalContext: z.string().nullable()
      }).optional(),
      mode: z.enum(['meeting', 'dashboard']).optional().default('meeting'),
      dashboardContext: z.object({
        recentMeetings: z.array(z.object({
          id: z.string(),
          title: z.string(),
          created_at: z.string(),
          summary: z.string().nullable(),
          decisions: z.array(z.string()).nullable(),
          actionItems: z.array(z.string()).nullable(),
          url: z.string().optional(),
          participants: z.array(z.string()).optional()
        })).optional(),
        actionItems: z.array(z.object({
          id: z.string(),
          title: z.string(),
          status: z.string(),
          priority: z.string().nullable(),
          dueDate: z.string().nullable(),
          sessionId: z.string()
        })).optional(),
        upcomingEvents: z.array(z.object({
          id: z.string(),
          title: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          description: z.string().nullable()
        })).optional(),
        searchResults: z.array(z.object({
          type: z.string(),
          title: z.string(),
          date: z.string().optional(),
          created_at: z.string().optional(),
          tldr: z.string().optional(),
          summary: z.string().optional(),
          score: z.number().optional(),
          similarity: z.number().optional(),
          key_decisions: z.array(z.union([
            z.string(),
            z.object({
              decision: z.string().optional(),
              text: z.string().optional(),
              title: z.string().optional()
            })
          ])).optional(),
          action_items: z.array(z.union([
            z.string(),
            z.object({
              task: z.string().optional(),
              text: z.string().optional(),
              title: z.string().optional()
            })
          ])).optional(),
          relevance: z.object({
            explanation: z.string(),
            score: z.number()
          }).optional(),
          metadata: z.object({
            key_decisions: z.array(z.string()).optional(),
            action_items: z.array(z.string()).optional()
          }).optional()
        })).optional(),
        searchQuery: z.string().optional()
      }).optional()
    }).passthrough();

    let parsedBody;
    try {
      parsedBody = BodySchema.parse(body);
    } catch (e) {
      console.error('❌ Chat API Validation error:', e);
      console.error('📝 Request body received:', JSON.stringify(body, null, 2));
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: e instanceof Error ? e.message : 'Unknown validation error',
        received: body
      }, { status: 400 });
    }

    const {
      message,
      transcript = '',
      chatHistory = [],
      conversationType,
      sessionId,
      textContext,
      conversationTitle,
      meetingUrl,
      summary,
      uploadedFiles,
      selectedPreviousConversations,
      personalContext,
      participantMe,
      participantThem,
      smartNotes,
      fileAttachments,
      stage,
      isRecording = false,
      transcriptLength = 0,
      sessionOwner,
      mode = 'meeting',
      dashboardContext,
    } = parsedBody;

    // ------------------------------------------------------------------
    // Fetch and combine all available context
    // ------------------------------------------------------------------
    let combinedContext = textContext || '';
    let aiInstructions: string | null = null;
    let agendaSection = '';

    if (sessionId) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      
      console.log('🔍 Chat Guidance Debug - Auth check:', {
        hasAuthHeader: !!authHeader,
        hasToken: !!token,
        sessionId: sessionId
      });

      if (token) {
        try {
          const supabase = createAuthenticatedSupabaseClient(token);
          console.log('🔍 Chat Guidance Debug - Created Supabase client');

          // Fetch AI instructions for this session
          const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('ai_instructions')
            .eq('id', sessionId)
            .single();

          if (!sessionError && sessionData?.ai_instructions) {
            aiInstructions = sessionData.ai_instructions;
            console.log('🤖 AI Instructions found for session:', {
              sessionId,
              instructionsLength: aiInstructions?.length ?? 0,
              instructionsPreview: aiInstructions ? (aiInstructions.substring(0, 100) + (aiInstructions.length > 100 ? '...' : '')) : 'No instructions'
            });
          }

          // Fetch current agenda items for this session
          console.log('🔍 Chat Guidance Debug - Fetching agenda items...');
          const { data: agendaItems, error: agendaError } = await supabase
            .from('agenda_items')
            .select('id, title, description, status, order_index')
            .eq('session_id', sessionId)
            .order('order_index', { ascending: true })
            .limit(20);

          if (!agendaError && agendaItems && agendaItems.length > 0) {
            agendaSection = '\n\n📋 CURRENT MEETING AGENDA:\n';
            agendaItems.forEach((item, idx) => {
              const statusEmoji = item.status === 'done' ? '✅' : item.status === 'in_progress' ? '🔄' : '⏳';
              agendaSection += `${idx + 1}. ${statusEmoji} ${item.title}`;
              if (item.description) agendaSection += ` - ${item.description}`;
              agendaSection += ` [${item.status}]\n`;
            });
            
            const completedCount = agendaItems.filter(item => item.status === 'done').length;
            const progressPercent = Math.round((completedCount / agendaItems.length) * 100);
            agendaSection += `\nAgenda Progress: ${completedCount}/${agendaItems.length} completed (${progressPercent}%)\n`;
            
            console.log('📋 Agenda items found for session:', {
              sessionId,
              itemsCount: agendaItems.length,
              completedCount,
              progressPercent
            });
          } else if (agendaError) {
            console.error('❌ Error fetching agenda items:', agendaError);
          } else {
            console.log('📋 No agenda items found for session:', sessionId);
          }

          // Fetch current session real-time summary to include in context
          let realtimeSummarySection = '';
          try {
            const { data: currentSessionSummary, error: currentSummaryError } = await supabase
              .from('sessions')
              .select('realtime_summary_cache')
              .eq('id', sessionId)
              .single();
            if (!currentSummaryError && currentSessionSummary?.realtime_summary_cache) {
              const cache: any = currentSessionSummary.realtime_summary_cache;
              const tldr: string | undefined = cache?.tldr || cache?.summary || undefined;
              const keyPoints: string[] | undefined = cache?.keyPoints || cache?.key_points || undefined;
              realtimeSummarySection = '\n\n🧠 REAL-TIME SUMMARY:\n';
              if (tldr) realtimeSummarySection += `TLDR: ${tldr}\n`;
              if (Array.isArray(keyPoints) && keyPoints.length > 0) {
                realtimeSummarySection += 'Key Points:\n';
                keyPoints.slice(0, 5).forEach((kp: string) => {
                  realtimeSummarySection += `• ${kp}\n`;
                });
              }
              console.log('🧠 Added real-time summary section to context:', {
                hasTldr: !!tldr,
                keyPointsCount: Array.isArray(keyPoints) ? keyPoints.length : 0,
              });
            }
          } catch (e) {
            console.error('❌ Error fetching real-time summary for session:', e);
          }

          // 1. Fetch linked conversation IDs
          console.log('🔍 Chat Guidance Debug - Fetching linked conversation IDs...');
          const { data: linkedLinks, error: linksError } = await supabase
            .from('conversation_links')
            .select('linked_session_id')
            .eq('session_id', sessionId);
          
          if (linksError) {
            console.error('❌ Error fetching linked conversation IDs:', linksError);
            throw linksError;
          }

          const linkedIds = linkedLinks?.map(l => l.linked_session_id) || [];
          console.log('🔍 Chat Guidance Debug - Linked conversation IDs:', linkedIds);

          if (linkedIds.length > 0) {
            // 2. First try to get rich summaries from the summaries table (generated after meetings complete)
            console.log('🔍 Chat Guidance Debug - Fetching rich summaries from summaries table...');
            const { data: richSummaries, error: summariesError } = await supabase
              .from('summaries')
              .select(`
                title,
                tldr,
                key_decisions,
                action_items,
                follow_up_questions,
                conversation_highlights,
                structured_notes,
                session_id,
                created_at
              `)
              .in('session_id', linkedIds)
              .eq('generation_status', 'completed')
              .order('created_at', { ascending: false })
              .limit(3);

            console.log('🔍 Chat Guidance Debug - Rich summaries found:', richSummaries?.length || 0);
            
            let previousMeetingsSummary = '';
            
            if (richSummaries && richSummaries.length > 0) {
              // Use rich summaries from the summaries table
              console.log('🔍 Chat Guidance Debug - Using rich summaries:', richSummaries.map(s => s.title));
              
              previousMeetingsSummary = '\n\nPREVIOUS MEETINGS DETAILED SUMMARY:\n';
              richSummaries.forEach((summary, i) => {
                const meetingDate = summary.created_at ? ` (${formatMeetingDate(summary.created_at)})` : '';
                previousMeetingsSummary += `\n${i + 1}. ${summary.title}${meetingDate}:\n`;
                previousMeetingsSummary += `   TLDR: ${summary.tldr || 'No summary available.'}\n`;
                
                if (summary.key_decisions && Array.isArray(summary.key_decisions) && summary.key_decisions.length > 0) {
                  previousMeetingsSummary += `   KEY DECISIONS:\n`;
                  summary.key_decisions.slice(0, 5).forEach((decision: string) => {
                    previousMeetingsSummary += `   • ${decision}\n`;
                  });
                }
                
                if (summary.action_items && Array.isArray(summary.action_items) && summary.action_items.length > 0) {
                  previousMeetingsSummary += `   ACTION ITEMS:\n`;
                  summary.action_items.slice(0, 5).forEach((item: string) => {
                    previousMeetingsSummary += `   • ${item}\n`;
                  });
                }
                
                if (summary.conversation_highlights && Array.isArray(summary.conversation_highlights) && summary.conversation_highlights.length > 0) {
                  previousMeetingsSummary += `   KEY HIGHLIGHTS:\n`;
                  summary.conversation_highlights.slice(0, 3).forEach((highlight: string) => {
                    previousMeetingsSummary += `   • ${highlight}\n`;
                  });
                }
                
                previousMeetingsSummary += '\n';
              });
              
              console.log(`✅ Added ${richSummaries.length} rich summaries to context from summaries table.`);
            } else {
              // Fallback to realtime_summary_cache if no rich summaries available
              console.log('🔍 Chat Guidance Debug - No rich summaries found, falling back to session cache...');
              const { data: linkedSessions, error: sessionsError } = await supabase
                .from('sessions')
                .select('title, realtime_summary_cache, created_at')
                .in('id', linkedIds)
                .not('realtime_summary_cache', 'is', null)
                .order('created_at', { ascending: false })
                .limit(3);
              
              if (sessionsError) {
                console.error('❌ Error fetching session summaries:', sessionsError);
                throw sessionsError;
              }

              console.log('🔍 Chat Guidance Debug - Session cache summaries found:', linkedSessions?.length || 0);
              
              if (linkedSessions && linkedSessions.length > 0) {
                console.log('🔍 Chat Guidance Debug - Using session cache:', linkedSessions.map(s => s.title));
                
                previousMeetingsSummary = '\n\nPREVIOUS MEETINGS SUMMARY:\n';
                linkedSessions.forEach((session, i) => {
                  const summary = session.realtime_summary_cache?.tldr || 'No summary available.';
                  const meetingDate = session.created_at ? ` (${formatMeetingDate(session.created_at)})` : '';
                  previousMeetingsSummary += `\n${i + 1}. ${session.title}${meetingDate}:\n   - ${summary}`;
                });
                
                console.log(`✅ Added ${linkedSessions.length} basic summaries to context from session cache.`);
              } else {
                console.log('⚠️ No linked sessions with summaries found');
              }
            }
            
            if (previousMeetingsSummary) {
              // Prepend to the main context
              combinedContext = `${combinedContext}${previousMeetingsSummary}`;
              console.log('📝 Previous meetings summary preview:', previousMeetingsSummary.substring(0, 300) + '...');
            }
            // Add real-time summary to combined context (after previous meetings)
            if (realtimeSummarySection) {
              combinedContext = `${combinedContext}${realtimeSummarySection}`;
              console.log('🧠 Real-time summary section added to combined context');
            }
          } else {
            console.log('⚠️ No linked conversation IDs found');
          }
          
          // Add agenda items to combined context
          if (agendaSection) {
            combinedContext = `${combinedContext}${agendaSection}`;
            console.log('📋 Added agenda items to context:', agendaSection.substring(0, 200) + '...');
          }
        } catch (e) {
          console.error('❌ Error fetching linked conversation context:', e);
        }
      } else {
        console.log('⚠️ No auth token found in request');
      }
    } else {
      console.log('⚠️ No sessionId provided');
    }

    // Replace the old context logic with our new combined context
    const textContext_DEPRECATED = textContext;
    const selectedPreviousConversations_DEPRECATED = selectedPreviousConversations;
    const enhancedTextContext = combinedContext;
    
    const previousSummariesSection = ''; // This is now handled within combinedContext
    
    // Debug: Log the final combined context
    console.log('🔍 Chat Guidance Debug - Final context check:', {
      mode: mode,
      hasDashboardContext: !!dashboardContext,
      originalTextContext: textContext?.substring(0, 100) + (textContext && textContext.length > 100 ? '...' : ''),
      combinedContextLength: combinedContext.length,
      combinedContextPreview: combinedContext.substring(0, 300) + (combinedContext.length > 300 ? '...' : ''),
      hasPreviousMeetings: combinedContext.includes('PREVIOUS MEETINGS SUMMARY'),
      enhancedTextContextLength: enhancedTextContext.length,
      fileAttachmentsCount: fileAttachments?.length || 0,
      fileTypes: fileAttachments?.map(f => `${f.type}: ${f.filename}`) || []
    });

    // Fetch personal context from database if not provided
    let finalPersonalContext = personalContext;
    if (!personalContext && sessionId) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      
      if (token) {
        try {
          const supabase = createAuthenticatedSupabaseClient(token);
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (!userError && user) {
            const { data: userData, error: fetchError } = await supabase
              .from('users')
              .select('personal_context')
              .eq('id', user.id)
              .single();
            
            if (!fetchError && userData?.personal_context) {
              finalPersonalContext = userData.personal_context;
              console.log('✅ Fetched personal context from database:', {
                length: userData.personal_context.length,
                preview: userData.personal_context.substring(0, 100) + '...'
              });
            }
          }
        } catch (e) {
          console.error('❌ Error fetching personal context from database:', e);
        }
      }
    }

    // Debug logging for personal context
    console.log('🔍 Chat API Debug:', {
      hasPersonalContext: !!finalPersonalContext,
      personalContextLength: finalPersonalContext?.length || 0,
      personalContextPreview: finalPersonalContext ? finalPersonalContext.substring(0, 100) + '...' : null,
      messagePreview: message.substring(0, 50) + '...'
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Parse context from message if it exists
    const parsedContext = parseContextFromMessage(message);
    const effectiveConversationType = parsedContext.conversationType || conversationType;

    const runningSummary = summary?.tldr || '';
    const effectiveTranscript = transcript;

    // Debug log chat history being received
    console.log('🔍 Chat API - Received chat history:', {
      chatHistoryLength: chatHistory.length,
      chatHistoryPreview: chatHistory.slice(-5).map((m: ChatMessage) => `${m.type}: ${m.content.substring(0, 50)}...`)
    });

    const chatMessages = buildChatMessages(
      parsedContext.userMessage,
      effectiveTranscript,
      chatHistory.map(msg => ({
        ...msg,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
      })),
      effectiveConversationType,
      runningSummary,
      finalPersonalContext || undefined,
      enhancedTextContext || undefined,
      8000, // reduced transcript limit to lower token usage while keeping recent context
      participantMe,
      participantThem,
      fileAttachments // Pass file attachments to buildChatMessages
    );

    // Use different model based on mode
    const defaultModel = await getAIModelForAction(
      mode === 'dashboard' ? AIAction.DASHBOARD_CHAT : AIAction.CHAT_GUIDANCE
    );

    // Build smart notes context if provided
    let smartNotesPrompt = '';
    if (smartNotes && smartNotes.length > 0) {
      const topNotes = smartNotes.slice(0, 5);
      const notesText = topNotes.map((n, idx) => `${idx + 1}. (${n.category || 'note'}) ${n.content || n.text || ''}`).join('\n');
      smartNotesPrompt = `SMART NOTES (last ${topNotes.length}):\n${notesText}`;
    }

    // Check if we need to perform agentic search for both dashboard and meeting modes
    let searchResults = null;
    let enhancedDashboardContext = dashboardContext;
    
    // For meeting mode, only perform search when query analysis indicates it's needed
    const shouldSearch = mode === 'dashboard' 
      ? await shouldPerformAgenticSearch(parsedContext.userMessage, dashboardContext || {})
      : await shouldPerformMeetingSearch(parsedContext.userMessage);
    
    console.log('🔍 RAG Search Debug:', {
      mode,
      shouldSearch,
      query: parsedContext.userMessage,
      hasAuthToken: !!request.headers.get('authorization'),
      env: process.env.NODE_ENV
    });
    
    if (shouldSearch) {
      console.log(`🔍 ${mode} mode: Performing agentic search for query:`, parsedContext.userMessage);
      
      // Call the search API directly
      try {
        console.log('🔗 Calling search API directly');
        
        // Check if we have auth
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
          console.error('❌ No authorization header for RAG search');
          throw new Error('No authorization header available for search');
        }
        
        // Make HTTP request to RAG search endpoint
        // Get the host from the request headers for server-side API calls
        const host = request.headers.get('host');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const searchUrl = `${protocol}://${host}/api/search/rag`;
        
        console.log('🔍 RAG search URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: parsedContext.userMessage,
            type: 'hybrid',
            threshold: 0.3,
            limit: mode === 'meeting' ? 5 : 10, // Limit results for meeting mode
            includeKeywordSearch: true
          })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          searchResults = searchData.results;
          
          // Debug: Log search details
          console.log('🔍 Search API response:', {
            mode: mode,
            query: searchData.query,
            totalFound: searchData.totalFound,
            resultsLength: searchResults?.length,
            searchType: searchData.searchType,
            threshold: searchData.metadata?.threshold
          });
          
          // Enhance context with search results
          if (mode === 'dashboard') {
            enhancedDashboardContext = {
              ...dashboardContext,
              searchResults: searchResults,
              searchQuery: searchData.query
            };
          }
          
          console.log(`✅ Agentic search found ${searchResults.length} relevant results`);
        } else {
          const errorText = await searchResponse.text();
          console.error('❌ Search API error:', searchResponse.status, errorText);
          
          // Log more details for debugging
          console.error('Search request details:', {
            hasAuth: !!authHeader,
            query: parsedContext.userMessage,
            mode: mode
          });
        }
      } catch (error) {
        console.error('❌ Agentic search error:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue with original context if search fails
      }
    }

    // Resolve session owner from authenticated user (do not trust client input)
    let sessionOwnerResolved = sessionOwner;
    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      if (token) {
        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch user profile for name and personal context if available
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, personal_context')
            .eq('id', user.id)
            .single();
          sessionOwnerResolved = {
            id: user.id,
            email: user.email || 'unknown@user',
            fullName: (userData as any)?.full_name || (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || (user.email ? user.email.split('@')[0] : null),
            personalContext: (userData as any)?.personal_context || finalPersonalContext || null,
          };
        }
      }
    } catch (e) {
      // If anything fails, keep whatever we had
    }

    // Generate system prompt based on mode (non-stream default)
    const systemPrompt = mode === 'dashboard' 
      ? getDashboardSystemPrompt(enhancedDashboardContext, finalPersonalContext || undefined, sessionOwnerResolved, searchResults)
      : getChatGuidanceSystemPrompt(
          effectiveConversationType, 
          isRecording, 
          transcriptLength, 
          participantMe, 
          participantThem, 
          conversationTitle || undefined, 
          enhancedTextContext || undefined, 
          meetingUrl || undefined,
          effectiveTranscript || undefined,
          sessionOwnerResolved,
          aiInstructions || undefined,
          searchResults,
          fileAttachments
        );

    // Note: For streaming, we'll add a lightweight override message later to request plain markdown.

    // Debug: Log the system prompt
    console.log('🤖 Nova System Prompt:');
    console.log('='.repeat(80));
    console.log(systemPrompt);
    console.log('='.repeat(80));

    // Additional debug: Check if we have meeting context
    if (enhancedTextContext) {
      console.log('✅ Meeting context being used in AI prompt:', {
        contextLength: enhancedTextContext.length,
        contextPreview: enhancedTextContext.substring(0, 200) + (enhancedTextContext.length > 200 ? '...' : ''),
        meetingTitle: conversationTitle,
        conversationType: effectiveConversationType
      });
    } else {
      console.log('⚠️ No meeting context available for AI prompt - textContext is:', enhancedTextContext);
    }

    if (smartNotesPrompt) {
      console.log('📝 Smart Notes Context:');
      console.log(smartNotesPrompt);
      console.log('='.repeat(80));
    }

    // Debug: Log the messages being sent when files are attached
    if (fileAttachments && fileAttachments.length > 0) {
      console.log('📎 Sending request with file attachments:', {
        fileCount: fileAttachments.length,
        files: fileAttachments.map(f => ({ type: f.type, filename: f.filename, hasDataUrl: !!f.dataUrl })),
        model: defaultModel,
        lastMessage: chatMessages[chatMessages.length - 1]
      });
    }

    // Build messages differently for streaming vs non-streaming
    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    if (streamMode) {
      const live = isRecording && transcriptLength > 0;
      const stage = getConversationStage(transcriptLength);
      const ownerName = sessionOwnerResolved?.fullName || sessionOwnerResolved?.email || 'the user';

      // Build a compact RAG section for streaming if we have search results
      const streamingRagSection = (results: any[] | null) => {
        if (!results || results.length === 0) return '';
        try {
          let section = '🔎 RELEVANT PAST CONVERSATIONS & CONTEXT:\n';
          results.slice(0, 5).forEach((r: any, i: number) => {
            const d = r.created_at || r.date || '';
            const score = Math.round(((r.score || r.similarity || 0) as number) * 100);
            section += `${i + 1}. "${r.title}"${d ? ` (${formatMeetingDate(d)})` : ''}\n`;
            if (r.tldr) section += `   Summary: ${r.tldr}\n`;
            else if (r.summary) section += `   Summary: ${r.summary}\n`;
            section += `   Relevance: ${isNaN(score) ? 'N/A' : `${score}%`}\n\n`;
          });
          return section;
        } catch {
          return '';
        }
      };

      // Build compact sections for dashboard mode
      const buildDashboardSections = (ctx: any) => {
        if (!ctx) return '';
        let out = '';
        if (ctx.searchResults && Array.isArray(ctx.searchResults) && ctx.searchResults.length > 0) {
          // RAG results will be rendered via streamingRagSection, so skip here to avoid duplication
        }
        if (ctx.recentMeetings && ctx.recentMeetings.length > 0) {
          out += '\n📊 RECENT MEETINGS:\n';
          ctx.recentMeetings.slice(0, 5).forEach((m: any, i: number) => {
            const d = m.created_at ? formatMeetingDate(m.created_at) : '';
            const link = m.url ? `[${m.title}](${m.url})` : `"${m.title}"`;
            out += `${i + 1}. ${link}${d ? ` (${d})` : ''}\n`;
            if (m.summary) out += `   Summary: ${m.summary}\n`;
          });
        }
        if (ctx.actionItems && ctx.actionItems.length > 0) {
          out += '\n✅ ACTION ITEMS:\n';
          ctx.actionItems.slice(0, 5).forEach((a: any) => {
            out += `• ${a.title}${a.priority ? ` [${a.priority}]` : ''}${a.dueDate ? ` - Due: ${formatMeetingDate(a.dueDate)}` : ''}\n`;
          });
        }
        if (ctx.upcomingEvents && ctx.upcomingEvents.length > 0) {
          out += '\n📅 UPCOMING MEETINGS:\n';
          ctx.upcomingEvents.slice(0, 5).forEach((e: any) => {
            out += `• "${e.title}" - ${new Date(e.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric' })}\n`;
          });
        }
        return out;
      };

      // Build compact sections for meeting mode
      const meetingBits = [
        conversationTitle ? `• Title: "${conversationTitle}"` : '',
        enhancedTextContext ? `• Context: ${enhancedTextContext.substring(0, 5000)}` : '',
        meetingUrl ? `• Platform: ${meetingUrl}` : ''
      ].filter(Boolean).join('\n');

      const meetingStreamingSystem = `You are Nova, ${ownerName}'s AI meeting advisor. Be direct, practical, and brief.

Rules:
- Output clean, conversational Markdown only (no JSON).
- ≤120 words unless asked for depth.
- Prefer bullets; use **bold** for emphasis when helpful.
- If context is insufficient, ask 1 concise clarifying question.

Identity:
- Address ${ownerName} (${sessionOwnerResolved?.email || 'unknown email'}) as "you".

Context:
Mode: ${live ? 'LIVE' : 'PREP'} | Stage: ${stage}
${meetingBits ? `\n🎯 MEETING DETAILS:\n${meetingBits}\n` : ''}
${searchResults && searchResults.length ? `\n${streamingRagSection(searchResults)}\n` : ''}`;

      const dashboardStreamingSystem = `You are Nova, ${ownerName}'s dashboard AI assistant.

Strict output rules:
- Output ONLY in clean, conversational Markdown (no JSON, no XML, no code fences unless showing code).
- Keep responses concise and avoid repetition.
- Keep it scannable: short paragraphs, bullets, and **bold** for emphasis when helpful.

Identity & addressing rules:
- The primary user is ${ownerName} (${sessionOwnerResolved?.email || 'unknown email'}). Treat them as "You".

Context
${finalPersonalContext ? `\n👤 PERSONAL CONTEXT:\n${finalPersonalContext}\n` : ''}
${searchResults && searchResults.length ? `\n${streamingRagSection(searchResults)}\n` : ''}
${enhancedDashboardContext ? buildDashboardSections(enhancedDashboardContext) : ''}`;

      const streamingSystem = mode === 'dashboard' ? dashboardStreamingSystem : meetingStreamingSystem;

      messages = [
        ...(smartNotesPrompt ? [{ role: 'system', content: smartNotesPrompt }] as any : []),
        { role: 'system', content: streamingSystem },
        ...chatMessages as any,
      ];
    } else {
      messages = [
        ...(smartNotesPrompt ? [{ role: 'system', content: smartNotesPrompt }] as any : []),
        { role: 'system', content: systemPrompt },
        ...chatMessages as any,
      ];
    }

    const requestBody: any = {
      model: defaultModel,
      messages,
      temperature: 0.4,
      max_tokens: 4000,
      ...(streamMode ? {} : { response_format: { type: 'json_object' } })
    };

    // Add file-parser plugin if PDFs are attached
    if (fileAttachments && fileAttachments.some(f => f.type === 'pdf')) {
      requestBody.plugins = [
        {
          id: 'file-parser',
          pdf: {
            engine: 'pdf-text' // Basic text extraction
          }
        }
      ];
    }

    // Log the full request body for debugging multimodal requests
    if (fileAttachments && fileAttachments.length > 0) {
      console.log('🚀 Full OpenRouter request body:', JSON.stringify(requestBody, null, 2));
    }

    // If streaming is requested, stream assistant text only and return early
    if (streamMode) {
      try {
        // Build streaming request (no JSON response_format)
        const streamingBody: any = {
          ...requestBody,
          stream: true,
        };
        delete streamingBody.response_format;

        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://liveconvo.app',
            'X-Title': 'liveprompt.ai AI Coach',
          },
          body: JSON.stringify(streamingBody)
        });

        if (!upstream.ok || !upstream.body) {
          const errorText = await upstream.text();
          console.error('OpenRouter API (stream) error:', upstream.status, errorText);
          return NextResponse.json(
            { error: `OpenRouter API error: ${upstream.status}` },
            { status: upstream.status }
          );
        }

        // Transform SSE stream into plain text token stream
        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += textDecoder.decode(value, { stream: true });

                // SSE events separated by two newlines
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const event of events) {
                  const lines = event.split('\n');
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const dataStr = trimmed.replace(/^data:\s*/, '');
                    if (dataStr === '[DONE]') {
                      // End of stream
                      controller.close();
                      return;
                    }
                    try {
                      const json = JSON.parse(dataStr);
                      // OpenAI-style delta content (OpenRouter compatible)
                      const delta = json?.choices?.[0]?.delta?.content
                        ?? json?.choices?.[0]?.message?.content
                        ?? '';
                      if (delta) {
                        controller.enqueue(textEncoder.encode(delta));
                      }
                    } catch (e) {
                      // Non-JSON line, ignore
                    }
                  }
                }
              }
              // Flush any remaining buffered data (unlikely to contain complete event)
              controller.close();
            } catch (err) {
              console.error('Streaming transform error:', err);
              controller.error(err);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          }
        });
      } catch (e) {
        console.error('Failed to stream from OpenRouter:', e);
        return NextResponse.json(
          { error: 'Streaming failed' },
          { status: 500 }
        );
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai AI Coach', // Optional: for app identification
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add logging for debugging
    console.log('OpenRouter response data:', data);
    console.log('Raw content to parse:', data.choices[0]?.message?.content);
    
    const rawContent = data.choices[0].message.content.trim();

    // Always expect JSON response with both response and suggestedActions
    try {
      let parsedContent;
      try {
        parsedContent = JSON.parse(rawContent);
      } catch (parseError) {
        // If raw parsing fails, try to extract JSON object from the response
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON object found in response');
        }
      }

      // Validate the response structure
      const validatedResponse = z.object({
        response: z.string(),
        suggestedActions: z.array(
          z.object({
            text: z.string().max(60),
            prompt: z.string(),
            impact: z.number().min(0).max(100).optional().default(80),
          })
        ).optional().default([]),
        documentSummary: z.string().optional()
      }).parse(parsedContent);

      // Check if the response field contains JSON (which it shouldn't)
      // This is a workaround for Gemini sometimes putting JSON in the response field
      if (validatedResponse.response.trim().startsWith('{') && validatedResponse.response.trim().endsWith('}')) {
        try {
          const nestedJson = JSON.parse(validatedResponse.response);
          if (nestedJson.response) {
            console.log('Found nested JSON in response, extracting actual text');
            validatedResponse.response = nestedJson.response;
            // Also extract suggested actions if they're better
            if (nestedJson.suggestedActions && Array.isArray(nestedJson.suggestedActions)) {
              validatedResponse.suggestedActions = nestedJson.suggestedActions;
            }
          }
        } catch (e) {
          // If parsing fails, keep the original response
          console.log('Response looks like JSON but failed to parse, keeping as-is');
        }
      }

      // If no suggested actions were provided, use fallback
      if (!validatedResponse.suggestedActions || validatedResponse.suggestedActions.length === 0) {
        const currentStage = getConversationStage(transcriptLength);
        validatedResponse.suggestedActions = getFallbackChips(
          effectiveConversationType || 'meeting', 
          currentStage
        ).slice(0, 3); // Take top 3 fallback chips
      }

      console.log('AI response with chips:', { 
        responseLength: validatedResponse.response.length,
        chipsCount: validatedResponse.suggestedActions.length,
        chips: validatedResponse.suggestedActions.map(c => c.text) 
      });

      return NextResponse.json(validatedResponse);
    } catch (e) {
      console.error('JSON parse/validate failed:', e);
      console.error('Raw content was:', rawContent.substring(0, 200) + '...');
      
      // Return fallback response
      const currentStage = getConversationStage(transcriptLength);
      const fallbackChips = getFallbackChips(effectiveConversationType || 'meeting', currentStage).slice(0, 3);
      
      return NextResponse.json({
        response: rawContent || "I'm here to help. What would you like to know about your conversation?",
        suggestedActions: fallbackChips
      });
    }

  } catch (error) {
    console.error('Chat guidance API error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate chat response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getChatGuidanceSystemPrompt(
  conversationType?: string, 
  isRecording: boolean = false, 
  transcriptLength: number = 0, 
  participantMe?: string, 
  participantThem?: string,
  meetingTitle?: string,
  meetingContext?: string,
  meetingUrl?: string,
  transcript?: string,
  sessionOwner?: {
    id: string;
    email: string;
    fullName: string | null;
    personalContext: string | null;
  },
  aiInstructions?: string,
  searchResults?: Array<{
    type: string;
    title: string;
    date?: string;
    created_at?: string;
    tldr?: string;
    summary?: string;
    score?: number;
    similarity?: number;
    key_decisions?: Array<string | { decision?: string; text?: string; title?: string }>;
    action_items?: Array<string | { task?: string; text?: string; title?: string }>;
  }>,
  fileAttachments?: Array<{
    type: 'image' | 'pdf';
    dataUrl: string;
    filename: string;
  }>
): string {
  const live = isRecording && transcriptLength > 0;
  const modeDescriptor = live ? '🎥 LIVE (conversation in progress)' : '📝 PREP (planning before the call)';
  const meLabel = participantMe || 'You';
  const themLabel = participantThem || 'The other participant';
  const stage = getConversationStage(transcriptLength);

  // Build meeting context section - make it more prominent
  let meetingContextSection = '';
  if (meetingTitle || meetingContext || meetingUrl) {
    meetingContextSection = '\n🎯 MEETING DETAILS:\n';
    if (meetingTitle) meetingContextSection += `• Title: "${meetingTitle}"\n`;
    if (meetingContext) {
      meetingContextSection += `• Context/Agenda: ${meetingContext}\n`;
      // Debug log to ensure context is being passed
      console.log('✅ Meeting context included in prompt:', meetingContext.substring(0, 100) + (meetingContext.length > 100 ? '...' : ''));
    }
    if (meetingUrl) meetingContextSection += `• Platform: ${meetingUrl}\n`;
    meetingContextSection += '\n';
  } else {
    console.log('⚠️ No meeting context provided to AI system prompt');
  }

  // Build session owner context
  let sessionOwnerSection = '';
  if (sessionOwner) {
    sessionOwnerSection = '\n🔐 SESSION OWNER (Primary User):\n';
    sessionOwnerSection += `• Name: ${sessionOwner.fullName || sessionOwner.email}\n`;
    sessionOwnerSection += `• Email: ${sessionOwner.email}\n`;
    if (sessionOwner.personalContext) {
      sessionOwnerSection += `• Personal Context: ${sessionOwner.personalContext}\n`;
    }
    sessionOwnerSection += '\nIMPORTANT: This is the primary user who created this session. Tailor all advice specifically for them.\n';
  }

  // Build AI instructions section
  let aiInstructionsSection = '';
  if (aiInstructions) {
    aiInstructionsSection = '\n🤖 CUSTOM AI BEHAVIOR INSTRUCTIONS:\n';
    aiInstructionsSection += `${aiInstructions}\n`;
    aiInstructionsSection += '\nIMPORTANT: Follow these custom instructions carefully throughout the conversation.\n';
  }

  // Build search results section for meeting mode
  let searchResultsSection = '';
  if (searchResults && searchResults.length > 0) {
    searchResultsSection = '\n🔎 RELEVANT PAST CONVERSATIONS & CONTEXT:\n';
    searchResults.forEach((result, idx) => {
      const resultDate = result.created_at ? formatMeetingDate(result.created_at) : result.date ? formatMeetingDate(result.date) : '';
      searchResultsSection += `${idx + 1}. "${result.title}"`;
      if (resultDate) searchResultsSection += ` (${resultDate})`;
      searchResultsSection += '\n';
      
      // Add summary
      if (result.tldr) {
        searchResultsSection += `   Summary: ${result.tldr}\n`;
      } else if (result.summary) {
        searchResultsSection += `   Summary: ${result.summary}\n`;
      }
      
      // Add relevance score
      const relevanceScore = result.score || result.similarity || 0;
      searchResultsSection += `   Relevance: ${Math.round(relevanceScore * 100)}%\n`;
      
      // Add key decisions if available
      if (result.key_decisions && Array.isArray(result.key_decisions) && result.key_decisions.length > 0) {
        const decisionTexts = result.key_decisions.slice(0, 2).map((decision) => 
          typeof decision === 'string' ? decision : 
          (decision as { decision?: string; text?: string; title?: string }).decision || (decision as { decision?: string; text?: string; title?: string }).text || String(decision)
        );
        searchResultsSection += `   Key Decisions: ${decisionTexts.join('; ')}\n`;
      }
      
      // Add action items if available
      if (result.action_items && Array.isArray(result.action_items) && result.action_items.length > 0) {
        const actionTexts = result.action_items.slice(0, 2).map((action) => 
          typeof action === 'string' ? action : 
          (action as { task?: string; text?: string; title?: string }).task || (action as { task?: string; text?: string; title?: string }).text || String(action)
        );
        searchResultsSection += `   Action Items: ${actionTexts.join('; ')}\n`;
      }
      
      searchResultsSection += '\n';
    });
    searchResultsSection += 'Use this historical context to provide more informed and relevant advice.\n';
  }

  // Build file attachments section
  let fileAttachmentsSection = '';
  if (fileAttachments && fileAttachments.length > 0) {
    fileAttachmentsSection = '\n📎 ATTACHED FILES:\n';
    fileAttachments.forEach((file, idx) => {
      fileAttachmentsSection += `${idx + 1}. ${file.filename} (${file.type === 'image' ? 'Image' : 'PDF document'})\n`;
    });
    fileAttachmentsSection += 'These files have been provided by the user for additional context. Analyze them to provide more informed responses.\n';
  }

  return `You are Nova, ${meLabel}'s helpful AI meeting advisor. Your job is to be genuinely useful - answer questions directly, give practical advice, and help ${meLabel} navigate their conversation with ${themLabel}.

${getCurrentDateContext()}
${sessionOwnerSection}${aiInstructionsSection}${searchResultsSection}${fileAttachmentsSection}
CURRENT SITUATION: ${modeDescriptor}${meetingContextSection}
Conversation Stage: ${stage}
${transcript ? `Conversation Transcript: ${transcript}` : ''}

YOUR RESPONSE FORMAT:
You must ALWAYS respond with a JSON object containing these fields:
1. "response": Your helpful answer to the user's question (string)
2. "suggestedActions": An array of 3 contextual actions the user can take next
3. "documentSummary": (ONLY if files are attached) A concise summary of key information extracted from the attached documents

Example format WITHOUT files:
{
  "response": "Based on the transcript, ${themLabel} seems concerned about pricing. I'd suggest addressing their budget constraints directly and offering flexible payment options.",
  "suggestedActions": [
    {"text": "💰 Discuss budget", "prompt": "How can I tactfully explore their budget constraints?", "impact": 90},
    {"text": "📊 Show ROI", "prompt": "What ROI examples would resonate with their industry?", "impact": 85},
    {"text": "🎯 Offer options", "prompt": "What flexible pricing options can I present?", "impact": 80}
  ]
}
Example format WITH files:
{
  "response": "I've analyzed the contract you uploaded. The key terms include a 3-year commitment at $50,000 annually with auto-renewal. There's a 30-day termination clause that requires written notice.",
  "suggestedActions": [
    {"text": "📝 Review terms", "prompt": "What are the most important contract terms I should negotiate?", "impact": 90},
    {"text": "⚖️ Legal concerns", "prompt": "Are there any red flags in this contract I should be aware of?", "impact": 85},
    {"text": "💰 Pricing options", "prompt": "How can I negotiate better pricing terms?", "impact": 80}
  ],
  "documentSummary": "Contract type: SaaS Agreement | Duration: 3 years | Value: $150k total | Key terms: Auto-renewal, 30-day termination notice, usage-based pricing tiers | Important dates: Start date Jan 1, 2025, First renewal Dec 31, 2027"
}

DOCUMENT SUMMARY GUIDELINES (when files are attached):
- ALWAYS generate a documentSummary when files are attached, even if the user just says "uploaded" or similar
- Extract and summarize the most important information from the document IMMEDIATELY
- Focus on: key data points, important dates, monetary values, names, critical terms
- Format: "Type: [doc type] | [Key fact 1] | [Key fact 2] | [Key fact 3]..."
- Keep it under 150 characters for easy display
- Make it scannable and useful for future reference
- The summary should capture the essence of the document for use in future suggestions

RESPONSE GUIDELINES:
- Be concise and focused - provide enough detail to be helpful without being verbose
- Use proper markdown formatting for better readability:
  • Use **bold** for emphasis
  • Use bullet points or numbered lists for multiple items
  • Use code formatting (backticks) for technical terms when appropriate
  • Structure longer responses with headers (##) if needed
- Be conversational and practical, not formal
- Reference specific things from the transcript when relevant
- Give actionable advice based on the current situation

SUGGESTED ACTIONS GUIDELINES:
- Each action should be immediately relevant to the current conversation stage
- Text: 3-5 words with an emoji (max 25 chars)
- Prompt: A specific question ${meLabel} can ask you about the situation with ${themLabel}
- Impact: Priority score 0-100 based on relevance
- Focus on what ${meLabel} should do next with ${themLabel}

Stage-specific focus for suggestions:
${stage === 'opening' ? '- Building rapport, setting agenda, understanding needs' : ''}
${stage === 'discovery' ? '- Asking deeper questions, understanding challenges, gathering information' : ''}
${stage === 'discussion' ? '- Presenting solutions, addressing concerns, moving toward decisions' : ''}
${stage === 'closing' ? '- Summarizing, confirming next steps, getting commitments' : ''}

IMPORTANT: You must ALWAYS return valid JSON with both fields. No other format is acceptable.`;
}

// Helper function to determine conversation stage based on transcript length
function getConversationStage(transcriptLength: number): string {
  if (transcriptLength < 500) return 'opening';
  if (transcriptLength < 1500) return 'discovery';
  if (transcriptLength < 3000) return 'discussion';
  return 'closing';
}

// Determine if we should perform agentic search for meeting mode
async function shouldPerformMeetingSearch(query: string): Promise<boolean> {
  console.log('🔎 Analyzing meeting query for search decision:', query);
  
  // Enhanced search triggers for meeting mode
  const searchKeywords = [
    'search', 'find', 'show me', 'last month', 'weeks ago', 'days ago',
    'tell me about', 'what about', 'explain', 'describe', 'regarding',
    'about the', 'meeting', 'conversation', 'discussion', 'call',
    'previous', 'earlier', 'history', 'past', 'before',
    'similar', 'related', 'other', 'another'
  ];
  const queryLower = query.toLowerCase();
  const hasSearchKeyword = searchKeywords.some(keyword => queryLower.includes(keyword));
  
  // Check for proper nouns and meeting-like patterns
  const hasProperNoun = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(query);
  const hasMeetingPattern = /\b\w+\s+meeting\b|\bmeeting\s+with\b|\bconversation\s+with\b/i.test(query);
  
  if (hasSearchKeyword || hasProperNoun || hasMeetingPattern) {
    console.log('🔎 Meeting search trigger detected:', {
      hasSearchKeyword,
      hasProperNoun,
      hasMeetingPattern,
      query: query.substring(0, 50)
    });
    return true;
  }
  
  // Analyze the query
  const analyzedQuery = analyzeQuery(query);
  
  console.log('🔎 Analyzed meeting query:', {
    intent: analyzedQuery.intent,
    participantsCount: analyzedQuery.participants.length,
    topicsCount: analyzedQuery.topics.length,
    temporalType: analyzedQuery.temporal.type,
    entitiesCount: analyzedQuery.entities.length
  });
  
  // Always search for specific queries in meeting mode
  if (analyzedQuery.intent === 'search' || analyzedQuery.intent === 'comparison') {
    console.log('🔎 Search/comparison intent detected - will search');
    return true;
  }
  
  // Search if asking about specific people
  if (analyzedQuery.participants.length > 0 && analyzedQuery.participants.some(p => p.type !== 'self')) {
    return true;
  }
  
  // Search if asking about specific dates
  if (analyzedQuery.temporal.type !== 'none') {
    return true;
  }
  
  // Search if asking about specific entities or topics
  if (analyzedQuery.entities.length > 0 || analyzedQuery.topics.length > 1) {
    return true;
  }
  
  console.log('🔎 No meeting search criteria met - proceeding without RAG search');
  return false;
}

// Determine if we should perform agentic search
async function shouldPerformAgenticSearch(query: string, dashboardContext: {
  recentMeetings?: Array<{ participants?: string[] }>;
}): Promise<boolean> {
  console.log('🔎 Analyzing query for search decision:', query);
  
  // Enhanced search triggers - more comprehensive keyword detection
  const searchKeywords = [
    'search', 'find', 'show me', 'last month', 'weeks ago', 'days ago',
    'tell me about', 'what about', 'explain', 'describe', 'regarding',
    'about the', 'meeting', 'conversation', 'discussion', 'call',
    'zen sciences', 'science', 'sciences'  // Add specific terms that were missed
  ];
  const queryLower = query.toLowerCase();
  const hasSearchKeyword = searchKeywords.some(keyword => queryLower.includes(keyword));
  
  // Also check for proper nouns and meeting-like patterns
  const hasProperNoun = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(query);
  const hasMeetingPattern = /\b\w+\s+meeting\b|\bmeeting\s+with\b|\bmeeeting\b/i.test(query);
  
  if (hasSearchKeyword || hasProperNoun || hasMeetingPattern) {
    console.log('🔎 Search trigger detected:', {
      hasSearchKeyword,
      hasProperNoun,
      hasMeetingPattern,
      query: query.substring(0, 50)
    });
    return true;
  }
  
  // Analyze the query
  const analyzedQuery = analyzeQuery(query);
  
  console.log('🔎 Analyzed query:', {
    intent: analyzedQuery.intent,
    participantsCount: analyzedQuery.participants.length,
    topicsCount: analyzedQuery.topics.length,
    temporalType: analyzedQuery.temporal.type,
    entitiesCount: analyzedQuery.entities.length
  });
  
  // Always search for specific queries
  if (analyzedQuery.intent === 'search') {
    console.log('🔎 Search intent detected - will search');
    return true;
  }
  
  // Search if asking about specific people not in recent meetings
  if (analyzedQuery.participants.length > 0) {
    const recentParticipants = new Set();
    dashboardContext?.recentMeetings?.forEach((meeting) => {
      if (meeting.participants) {
        meeting.participants.forEach((p: string) => recentParticipants.add(p.toLowerCase()));
      }
    });
    
    const hasUnknownParticipant = analyzedQuery.participants.some(
      p => p.type !== 'self' && !recentParticipants.has(p.name.toLowerCase())
    );
    
    if (hasUnknownParticipant) {
      return true;
    }
  }
  
  // Search if asking about dates outside the loaded range
  if (analyzedQuery.temporal.type !== 'none' && analyzedQuery.temporal.startDate) {
    const queryDate = new Date(analyzedQuery.temporal.startDate);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    if (queryDate < twoWeeksAgo) {
      return true;
    }
  }
  
  // Search if asking about specific entities or projects not in context
  if (analyzedQuery.entities.length > 0 || analyzedQuery.topics.length > 2) {
    return true;
  }
  
  // Search for comparison queries
  if (analyzedQuery.intent === 'comparison') {
    return true;
  }
  
  // Don't search for general summaries, action items overview, or schedule queries
  // that can be answered from the preloaded context
  if (analyzedQuery.intent === 'summary' || analyzedQuery.intent === 'action_items' || analyzedQuery.intent === 'schedule') {
    // Only search if they're asking about something specific
    const shouldSearchForSpecific = analyzedQuery.topics.length > 1 || analyzedQuery.participants.length > 1;
    if (shouldSearchForSpecific) {
      console.log('🔎 Specific summary/action/schedule query - will search');
    }
    return shouldSearchForSpecific;
  }
  
  console.log('🔎 No search criteria met - using preloaded context');
  return false;
}

// New function to parse context from user messages
function parseContextFromMessage(message: string): ParsedContext {
  // Look for context pattern: [Context: type - title] actual message
  const contextPattern = /^\[Context:\s*(\w+)\s*-\s*([^\]]+)\]\s*(.+)$/;
  const match = message.match(contextPattern);
  
  if (match) {
    const [, conversationType, conversationTitle, userMessage] = match;
    return {
      conversationType: conversationType.toLowerCase(),
      conversationTitle: conversationTitle.trim(),
      userMessage: userMessage.trim()
    };
  }
  
  // No context found, return original message
  return {
    userMessage: message
  };
}

// Dashboard-specific system prompt
function getDashboardSystemPrompt(
  dashboardContext?: {
    recentMeetings?: Array<{
      title: string;
      created_at: string;
      summary?: string;
      decisions?: string[];
      actionItems?: string[];
    }>;
    actionItems?: Array<{
      title: string;
      status: string;
      priority?: string;
      dueDate?: string;
    }>;
    upcomingEvents?: Array<{
      title: string;
      startTime: string;
      description?: string;
    }>;
  },
  personalContext?: string,
  sessionOwner?: {
    id: string;
    email: string;
    fullName: string | null;
    personalContext: string | null;
  },
  searchResults?: Array<{
    type: string;
    title: string;
    date: string;
    summary?: string;
    relevance: {
      explanation: string;
      score: number;
    };
    metadata?: {
      key_decisions?: string[];
      action_items?: string[];
    };
  }>
): string {
  const ownerName = sessionOwner?.fullName || sessionOwner?.email?.split('@')[0] || 'the user';
  
  // Build context sections
  let meetingsSection = '';
  if (dashboardContext?.recentMeetings && dashboardContext.recentMeetings.length > 0) {
    meetingsSection = '\n📊 RECENT MEETINGS:\n';
    dashboardContext.recentMeetings.forEach((meeting, idx) => {
      const meetingDate = meeting.created_at ? formatMeetingDate(meeting.created_at) : 'No date';
      const meetingWithUrl = meeting as { url?: string } & typeof meeting;
      const meetingLink = meetingWithUrl.url ? `[${meeting.title}](${meetingWithUrl.url})` : `"${meeting.title}"`;
      meetingsSection += `${idx + 1}. ${meetingLink} (${meetingDate})\n`;
      if (meeting.summary) meetingsSection += `   Summary: ${meeting.summary}\n`;
      if (meeting.decisions && meeting.decisions.length > 0) {
        const decisionTexts = meeting.decisions.slice(0, 3).map((decision: string | { decision?: string; text?: string; title?: string }) => 
          typeof decision === 'string' ? decision : 
          decision.decision || decision.text || decision.title || String(decision)
        );
        meetingsSection += `   Key Decisions: ${decisionTexts.join('; ')}\n`;
      }
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        const actionTexts = meeting.actionItems.slice(0, 3).map((action: string | { task?: string; text?: string; title?: string }) => 
          typeof action === 'string' ? action : 
          action.task || action.text || action.title || String(action)
        );
        meetingsSection += `   Action Items: ${actionTexts.join('; ')}\n`;
      }
      meetingsSection += '\n';
    });
  }

  let actionsSection = '';
  if (dashboardContext?.actionItems && dashboardContext.actionItems.length > 0) {
    const pendingActions = dashboardContext.actionItems.filter((a) => a.status === 'pending');
    const inProgressActions = dashboardContext.actionItems.filter((a) => a.status === 'in_progress');
    
    actionsSection = '\n✅ ACTION ITEMS:\n';
    if (pendingActions.length > 0) {
      actionsSection += `Pending (${pendingActions.length}):\n`;
      pendingActions.slice(0, 10).forEach((action) => {
        actionsSection += `• ${action.title}`;
        if (action.priority) actionsSection += ` [${action.priority}]`;
        if (action.dueDate) actionsSection += ` - Due: ${formatMeetingDate(action.dueDate)}`;
        actionsSection += '\n';
      });
    }
    if (inProgressActions.length > 0) {
      actionsSection += `\nIn Progress (${inProgressActions.length}):\n`;
      inProgressActions.slice(0, 5).forEach((action) => {
        actionsSection += `• ${action.title}\n`;
      });
    }
  }

  let eventsSection = '';
  if (dashboardContext?.upcomingEvents && dashboardContext.upcomingEvents.length > 0) {
    eventsSection = '\n📅 UPCOMING MEETINGS:\n';
    dashboardContext.upcomingEvents.slice(0, 5).forEach((event) => {
      const startTime = new Date(event.startTime);
      const timeStr = startTime.toLocaleString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      eventsSection += `• "${event.title}" - ${timeStr}\n`;
      if (event.description) {
        eventsSection += `  ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n`;
      }
    });
  }

  let personalContextSection = '';
  if (personalContext || sessionOwner?.personalContext) {
    personalContextSection = '\n👤 PERSONAL CONTEXT:\n';
    personalContextSection += personalContext || sessionOwner?.personalContext || '';
    personalContextSection += '\n';
  }

  let searchResultsSection = '';
  if (searchResults && searchResults.length > 0) {
    searchResultsSection = '\n🔎 SEARCH RESULTS (Most relevant to your query):\n';
    searchResults.forEach((result, idx) => {
      const resultAny = result as typeof result & {
        created_at?: string;
        tldr?: string;
        score?: number;
        similarity?: number;
        key_decisions?: Array<string | { decision?: string; text?: string; title?: string }>;
        action_items?: Array<string | { task?: string; text?: string; title?: string }>;
      };
      const resultDate = resultAny.created_at ? formatMeetingDate(resultAny.created_at) : result.date ? formatMeetingDate(result.date) : 'No date';
      searchResultsSection += `${idx + 1}. [${result.type}] "${result.title}" (${resultDate})\n`;
      
      // Handle summary data from enhanced search results
      if (resultAny.tldr) {
        searchResultsSection += `   Summary: ${resultAny.tldr}\n`;
      } else if (result.summary) {
        searchResultsSection += `   Summary: ${result.summary}\n`;
      }
      
      // Handle the new RAG search format - use score instead of relevance object
      const relevanceScore = resultAny.score || resultAny.similarity || 0;
      searchResultsSection += `   Relevance: ${Math.round(relevanceScore * 100)}%\n`;
      
      // Handle key decisions from enhanced search results
      if (resultAny.key_decisions && Array.isArray(resultAny.key_decisions) && resultAny.key_decisions.length > 0) {
        const decisionTexts = resultAny.key_decisions.slice(0, 2).map((decision) => 
          typeof decision === 'string' ? decision : 
          decision.decision || decision.text || decision.title || String(decision)
        );
        searchResultsSection += `   Key Decisions: ${decisionTexts.join('; ')}\n`;
      } else if (result.metadata?.key_decisions && result.metadata.key_decisions.length > 0) {
        searchResultsSection += `   Key Decisions: ${result.metadata.key_decisions.slice(0, 2).join('; ')}\n`;
      }
      
      // Handle action items from enhanced search results
      if (resultAny.action_items && Array.isArray(resultAny.action_items) && resultAny.action_items.length > 0) {
        const actionTexts = resultAny.action_items.slice(0, 2).map((action) => 
          typeof action === 'string' ? action : 
          action.task || action.text || action.title || String(action)
        );
        searchResultsSection += `   Action Items: ${actionTexts.join('; ')}\n`;
      } else if (result.metadata?.action_items && result.metadata.action_items.length > 0) {
        searchResultsSection += `   Action Items: ${result.metadata.action_items.slice(0, 2).join('; ')}\n`;
      }
      
      searchResultsSection += '\n';
    });
    searchResultsSection += '💡 These results were found by searching beyond your recent 2-week window based on your specific query.\n';
  }

  return `You are Nova, ${ownerName}'s dashboard AI assistant. You have access to their recent meetings, action items, and upcoming calendar events. Your job is to help them stay organized, track decisions, prepare for meetings, and find information across all their conversations.

${getCurrentDateContext()}
${personalContextSection}
AVAILABLE DATA:
${searchResultsSection}${meetingsSection}${actionsSection}${eventsSection}

YOUR CAPABILITIES:
- Answer questions about any meeting from your conversation history
- Track and summarize action items across meetings
- Help prepare for upcoming meetings
- Identify patterns and trends across conversations
- Find specific information or decisions from any past meeting
- Provide meeting summaries and key takeaways

YOUR RESPONSE FORMAT:
You must respond with a JSON object containing these fields:
1. "response": Your natural language answer (string, NOT JSON)
2. "suggestedActions": Array of 3 contextual actions
3. "documentSummary": (ONLY if files are attached) Concise summary of attached documents

CORRECT Example WITHOUT files:
{
  "response": "You have 5 pending action items from this week's meetings. The highest priority is 'Update pricing proposal' from Tuesday's sales meeting, due tomorrow.",
  "suggestedActions": [
    {"text": "📋 Show all tasks", "prompt": "List all my pending action items with their deadlines", "impact": 90},
    {"text": "📅 Tomorrow's prep", "prompt": "What should I prepare for tomorrow's meetings?", "impact": 85},
    {"text": "📊 Week summary", "prompt": "Summarize key decisions from this week", "impact": 80}
  ]
}

CORRECT Example WITH files:
{
  "response": "I've reviewed your quarterly report. Revenue is up 15% YoY at $2.5M, with Enterprise segment leading growth. The main concern is APAC market penetration at only 5% of target.",
  "suggestedActions": [
    {"text": "🌏 APAC strategy", "prompt": "What strategies can we implement to improve APAC market penetration?", "impact": 95},
    {"text": "🏢 Enterprise insights", "prompt": "Show me detailed breakdown of Enterprise segment performance", "impact": 85},
    {"text": "📈 Growth drivers", "prompt": "What are the key factors driving our 15% revenue growth?", "impact": 80}
  ],
  "documentSummary": "Type: Q4 Report | Revenue: $2.5M (+15%) | Top: Enterprise segment | Concern: APAC at 5% of target | Next: Board review Jan 15"
}

WRONG Example (DO NOT DO THIS):
{
  "response": "{\"response\": \"Your answer here\", \"suggestedActions\": [...]}",
  "suggestedActions": [...]
}

DOCUMENT SUMMARY GUIDELINES (when files are attached):
- ALWAYS generate a documentSummary when files are attached
- Extract key information: type, metrics, dates, names, critical findings
- Format: "Type: [doc type] | [Key fact 1] | [Key fact 2] | [Key fact 3]..."
- Keep under 150 characters for display
- Focus on actionable insights that can be referenced in future suggestions

RESPONSE GUIDELINES for the "response" field:
- Write natural, conversational text
- Be specific and reference actual meeting titles and dates
- Use markdown for clear formatting (bullets, bold, headers)
- When referencing meetings, ALWAYS use the markdown links provided in the context (e.g., [Meeting Title](url))
- When listing items, include relevant context (meeting source, date, priority)
- For action items, always mention due dates and priority
- Be proactive in suggesting what they might need
- DO NOT include JSON in the response field - just plain text/markdown

IMPORTANT: The "response" field must contain your actual answer as a string, not JSON.`;
}
