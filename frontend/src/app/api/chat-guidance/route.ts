import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

// Helper function to format dates in a human-readable way
function formatMeetingDate(dateString: string): string {
  const date = new Date(dateString);
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
  timestamp: Date;
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
  smartNotes?: Array<any>;
}

// Add interface for parsed context
interface ParsedContext {
  conversationType?: string;
  conversationTitle?: string;
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate body
    const BodySchema = z.object({
      message: z.string(),
      transcript: z.string().default(''),
      chatHistory: z.any().default([]),
      conversationType: z.string().optional(),
      sessionId: z.string().optional(),
      textContext: z.string().nullable().optional(),
      conversationTitle: z.string().nullable().optional(),
      meetingUrl: z.string().nullable().optional().default(''),
      summary: z.any().optional(),
      uploadedFiles: z.any().optional(),
      selectedPreviousConversations: z.any().optional(),
      personalContext: z.string().nullable().optional(),
      participantMe: z.string().optional(),
      participantThem: z.string().optional(),
      smartNotes: z.array(z.any()).optional(),
      stage: z.enum(['opening','discovery','demo','pricing','closing','discussion']).optional(),
      isRecording: z.boolean().optional(),
      transcriptLength: z.number().optional()
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
      stage,
      isRecording = false,
      transcriptLength = 0,
    } = parsedBody;

    // ------------------------------------------------------------------
    // Fetch and combine all available context
    // ------------------------------------------------------------------
    let combinedContext = textContext || '';

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
          } else {
            console.log('⚠️ No linked conversation IDs found');
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
      originalTextContext: textContext?.substring(0, 100) + (textContext && textContext.length > 100 ? '...' : ''),
      combinedContextLength: combinedContext.length,
      combinedContextPreview: combinedContext.substring(0, 300) + (combinedContext.length > 300 ? '...' : ''),
      hasPreviousMeetings: combinedContext.includes('PREVIOUS MEETINGS SUMMARY'),
      enhancedTextContextLength: enhancedTextContext.length
    });

    // Debug logging for personal context
    console.log('🔍 Chat API Debug:', {
      hasPersonalContext: !!personalContext,
      personalContextLength: personalContext?.length || 0,
      personalContextPreview: personalContext ? personalContext.substring(0, 100) + '...' : null,
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

    // If request body contains a recognized callStage we treat as chip-generation request
    const chipsMode = !!stage;

    let runningSummary = summary?.tldr || '';
    let effectiveTranscript = transcript;

    if (transcript.length > 3500) {
      // Split transcript: keep tail for context, summarize the rest.
      const overflowChunk = transcript.slice(0, transcript.length - 3500);
      effectiveTranscript = transcript.slice(-3500);
      try {
        runningSummary = await updateRunningSummary(runningSummary, overflowChunk);
      } catch (e) {
        console.error('Running summary update failed:', e);
      }
    }

    const getChipPrompt = (conv:string, stg:string, obj:string, transcript:string, meLabel:string, themLabel:string)=>{
      const transcriptContext = transcript ? transcript.slice(-1000) : ''; // Increased context
      const contextInfo = obj ? `\nMeeting Context/Agenda: "${obj}"` : '';
      
      return `You are an expert ${conv || 'meeting'} conversation coach generating contextual action suggestions for ${meLabel} during their conversation with ${themLabel}.

PARTICIPANTS:
- "${meLabel}" = The person using this AI advisor (needs suggestions)
- "${themLabel}" = The person ${meLabel} is speaking with

CONVERSATION DETAILS:
- Type: ${conv || 'meeting'}
- Stage: ${stg}${contextInfo}
- Recent conversation: "${transcriptContext || 'No transcript yet'}"

Generate EXACTLY 3 contextual suggestions that ${meLabel} can use RIGHT NOW in their conversation with ${themLabel}. Each suggestion should be:
1. ACTIONABLE: Something ${meLabel} can do immediately
2. CONTEXTUAL: Based on the current conversation stage and content
3. STRATEGIC: Helps ${meLabel} achieve their goals with ${themLabel}

Focus on what ${meLabel} should do, ask, or say next with ${themLabel} based on:
- The current conversation stage (${stg})
- What's been discussed so far
- What ${meLabel} needs to accomplish
- How to move the conversation forward effectively

CRITICAL: Return ONLY a valid JSON array. No text before or after the JSON.
The response must start with [ and end with ]

Return exactly this format:
[
  {"text":"<emoji> 3-5 word action","prompt":"Specific question ${meLabel} can ask their AI advisor about what to do with ${themLabel}","impact":90},
  {"text":"<emoji> 3-5 word action","prompt":"Specific question ${meLabel} can ask their AI advisor about what to do with ${themLabel}","impact":80},
  {"text":"<emoji> 3-5 word action","prompt":"Specific question ${meLabel} can ask their AI advisor about what to do with ${themLabel}","impact":70}
]

STAGE-SPECIFIC GUIDANCE:
${stg === 'opening' ? `
OPENING STAGE - Focus on:
- Setting agenda and expectations
- Building rapport and trust
- Understanding ${themLabel}'s needs/goals
- Establishing conversation flow
Example: {"text":"🎯 Set clear agenda","prompt":"How should I structure the rest of this conversation with ${themLabel}?","impact":90}` : ''}

${stg === 'discovery' ? `
DISCOVERY STAGE - Focus on:
- Asking probing questions to ${themLabel}
- Understanding ${themLabel}'s challenges/needs
- Gathering important information from ${themLabel}
- Identifying opportunities
Example: {"text":"🔍 Ask deeper questions","prompt":"What follow-up questions should I ask ${themLabel} about their challenges?","impact":90}` : ''}

${stg === 'discussion' ? `
DISCUSSION STAGE - Focus on:
- Presenting solutions to ${themLabel}
- Addressing ${themLabel}'s concerns
- Negotiating or problem-solving with ${themLabel}
- Moving toward decisions
Example: {"text":"💡 Present solution","prompt":"How should I position our solution to address ${themLabel}'s specific needs?","impact":90}` : ''}

${stg === 'closing' ? `
CLOSING STAGE - Focus on:
- Summarizing key points with ${themLabel}
- Confirming next steps with ${themLabel}
- Getting commitments from ${themLabel}
- Planning follow-up
Example: {"text":"📋 Confirm next steps","prompt":"How should I establish clear next steps with ${themLabel}?","impact":90}` : ''}

CONVERSATION TYPE GUIDANCE:
${conv === 'sales' ? `
SALES CONVERSATION - Prioritize:
- Qualifying ${themLabel}'s budget and timeline
- Understanding ${themLabel}'s decision-making process
- Presenting value proposition to ${themLabel}
- Handling ${themLabel}'s objections
- Moving ${themLabel} toward purchase decision` : ''}

${conv === 'interview' ? `
INTERVIEW CONVERSATION - Prioritize:
- Understanding ${themLabel}'s role requirements
- Showcasing relevant experience to ${themLabel}
- Asking thoughtful questions about ${themLabel}'s team/company
- Demonstrating cultural fit to ${themLabel}
- Following up on next steps with ${themLabel}` : ''}

${conv === 'meeting' ? `
MEETING CONVERSATION - Prioritize:
- Keeping discussion focused with ${themLabel}
- Ensuring all participants (including ${themLabel}) contribute
- Making decisions with ${themLabel}
- Assigning action items to ${themLabel} and others
- Planning follow-up with ${themLabel}` : ''}

Make each suggestion specific to the current conversation with ${themLabel}. 
Remember: Start with [ and end with ] - no other text allowed.`;
    };

    const chatMessages = buildChatMessages(
      parsedContext.userMessage,
      effectiveTranscript,
      chatHistory,
      effectiveConversationType,
      runningSummary,
      personalContext || undefined,
      enhancedTextContext || undefined,
      4000, // transcript tail
      participantMe,
      participantThem
    );

    const defaultModel = await getDefaultAiModelServer();

    // Build smart notes context if provided
    let smartNotesPrompt = '';
    if (smartNotes && smartNotes.length > 0) {
      const topNotes = smartNotes.slice(0, 5);
      const notesText = topNotes.map((n, idx) => `${idx + 1}. (${n.category || 'note'}) ${n.content || n.text || ''}`).join('\n');
      smartNotesPrompt = `SMART NOTES (last ${topNotes.length}):\n${notesText}`;
    }

    // Generate system prompt
    const baseSystemPrompt = chipsMode 
      ? getChipPrompt(effectiveConversationType || 'meeting', stage || 'opening', enhancedTextContext || '', effectiveTranscript, participantMe || 'You', participantThem || 'The other participant')
      : getChatGuidanceSystemPrompt(effectiveConversationType, isRecording, transcriptLength, participantMe, participantThem, conversationTitle || undefined, enhancedTextContext || undefined, meetingUrl || undefined);

    const systemPrompt = `${baseSystemPrompt}${previousSummariesSection ? `\n\n${previousSummariesSection}` : ''}`;

    // Debug: Log the system prompt
    console.log('🤖 AI Advisor System Prompt:');
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai AI Coach', // Optional: for app identification
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          ...(smartNotesPrompt ? [{ role: 'system', content: smartNotesPrompt }] : []),
          { role: 'system', content: systemPrompt },
          ...chatMessages,
        ],
        temperature: 0.4,
        max_tokens: 1500,
        ...(defaultModel.startsWith('google/') ? {} : { response_format: { type: 'json_object' } })
      })
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

    if (chipsMode) {
      // Expecting an array of chip objects
      try {
        // First try to parse the raw content
        let parsedContent;
        try {
          parsedContent = JSON.parse(rawContent);
        } catch (parseError) {
          // If raw parsing fails, try to extract JSON array from the response
          const jsonMatch = rawContent.match(/\[\s*\{[\s\S]*?\}\s*\]/);
          if (jsonMatch) {
            parsedContent = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON array found in response');
          }
        }

        // Validate the parsed content
        const chips = z
          .array(
            z.object({
              text: z.string().max(40),
              prompt: z.string(),
              impact: z.number().min(0).max(100).optional(),
            })
          )
          .parse(parsedContent);

        console.log('chips_shown', { stage, texts: chips.map((c) => c.text) });
        return NextResponse.json({ suggestedActions: chips });
      } catch (e) {
        console.error('Chip JSON parse/validate failed:', e);
        console.error('Raw content was:', rawContent.substring(0, 200) + '...');
        
        // Return fallback chips based on conversation type and stage
        const fallbackChips = getFallbackChips(effectiveConversationType || 'meeting', stage || 'discovery');
        console.log('Returning fallback chips:', { 
          conversationType: effectiveConversationType, 
          stage,
          chips: fallbackChips.map(c => c.text) 
        });
        return NextResponse.json({ suggestedActions: fallbackChips });
      }
    } else {
      // Expecting full ChatResponse object
      let chatResp: any;
      try {
        chatResp = JSON.parse(rawContent);
      } catch {
        // If not JSON, wrap string into response field
        chatResp = { response: rawContent, confidence: 0 };
      }

      // Basic shape validation
      if (typeof chatResp.response !== 'string') {
        chatResp.response = rawContent;
      }
      if (typeof chatResp.confidence !== 'number') {
        chatResp.confidence = 0;
      }

      return NextResponse.json(chatResp);
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
  meetingUrl?: string
): string {
  const live = isRecording && transcriptLength > 0;
  const modeDescriptor = live ? '🎥 LIVE (conversation in progress)' : '📝 PREP (planning before the call)';
  const meLabel = participantMe || 'You';
  const themLabel = participantThem || 'The other participant';

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

  /*
  Prompt design rationale  
  1. Give model clear role + objective 
  2. Keep answers concise with headline + 1-2 insights
  3. Markdown allowed because UI renders it
  4. NO JSON in the model output – we'll wrap it server-side for the UI.
  */

  return `You are ${meLabel}'s helpful AI meeting advisor. Your job is to be genuinely useful - answer questions directly, give practical advice, and help ${meLabel} navigate their conversation with ${themLabel}.

CURRENT SITUATION: ${modeDescriptor}${meetingContextSection}

BE CONVERSATIONAL AND HELPFUL:
- Answer questions directly and practically
- Give specific advice based on what's actually happening
- Reference the transcript when relevant (e.g., "When ${themLabel} mentioned X, that suggests...")
- **ALWAYS USE the meeting context/agenda above to provide more targeted advice**
- If asked "who said what", just summarize the key points from each person
- Keep responses under 100 words unless more detail is genuinely needed
- Write like you're a smart colleague, not a formal coach

EXAMPLES OF GOOD RESPONSES:
- "Based on the transcript, ${themLabel} seems most interested in the pricing discussion. I'd focus on that next."
- "Here's what happened: ${meLabel} asked about timeline, ${themLabel} said they need it by March. You should clarify if that's flexible."
- "The conversation stalled when ${themLabel} mentioned budget concerns. Try asking what specific budget range they're working with."
- "Given this meeting is about [meeting purpose from context], you should focus on [specific advice based on context]."

**Remember: Always reference the meeting context/agenda when giving advice to make it relevant to their specific situation.**

Just be helpful and direct. No coaching jargon, no meta-commentary about being a coach.`;
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

