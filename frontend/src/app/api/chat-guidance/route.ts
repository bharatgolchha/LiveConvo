import { NextRequest, NextResponse } from 'next/server';
import { buildChatMessages } from '@/lib/chatPromptBuilder';
import { updateRunningSummary } from '@/lib/summarizer';
import { z } from 'zod';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';

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

    // Debug log chat history being received
    console.log('🔍 Chat API - Received chat history:', {
      chatHistoryLength: chatHistory.length,
      chatHistoryPreview: chatHistory.slice(-5).map((m: ChatMessage) => `${m.type}: ${m.content.substring(0, 50)}...`)
    });

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

    const defaultModel = await getAIModelForAction(AIAction.CHAT_GUIDANCE);

    // Build smart notes context if provided
    let smartNotesPrompt = '';
    if (smartNotes && smartNotes.length > 0) {
      const topNotes = smartNotes.slice(0, 5);
      const notesText = topNotes.map((n, idx) => `${idx + 1}. (${n.category || 'note'}) ${n.content || n.text || ''}`).join('\n');
      smartNotesPrompt = `SMART NOTES (last ${topNotes.length}):\n${notesText}`;
    }

    // Generate system prompt - always include transcript for context
    const systemPrompt = getChatGuidanceSystemPrompt(
      effectiveConversationType, 
      isRecording, 
      transcriptLength, 
      participantMe, 
      participantThem, 
      conversationTitle || undefined, 
      enhancedTextContext || undefined, 
      meetingUrl || undefined,
      effectiveTranscript || undefined
    );

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
        response_format: { type: 'json_object' }
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
            text: z.string().max(40),
            prompt: z.string(),
            impact: z.number().min(0).max(100).optional().default(80),
          })
        ).optional().default([])
      }).parse(parsedContent);

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
  transcript?: string
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

  return `You are ${meLabel}'s helpful AI meeting advisor. Your job is to be genuinely useful - answer questions directly, give practical advice, and help ${meLabel} navigate their conversation with ${themLabel}.

${getCurrentDateContext()}

CURRENT SITUATION: ${modeDescriptor}${meetingContextSection}
Conversation Stage: ${stage}
${transcript ? `Recent Context: ${transcript.slice(-500)}` : ''}

YOUR RESPONSE FORMAT:
You must ALWAYS respond with a JSON object containing two fields:
1. "response": Your helpful answer to the user's question (string)
2. "suggestedActions": An array of 3 contextual actions the user can take next

Example format:
{
  "response": "Based on the transcript, ${themLabel} seems concerned about pricing. I'd suggest addressing their budget constraints directly and offering flexible payment options.",
  "suggestedActions": [
    {"text": "💰 Discuss budget", "prompt": "How can I tactfully explore their budget constraints?", "impact": 90},
    {"text": "📊 Show ROI", "prompt": "What ROI examples would resonate with their industry?", "impact": 85},
    {"text": "🎯 Offer options", "prompt": "What flexible pricing options can I present?", "impact": 80}
  ]
}

RESPONSE GUIDELINES:
- Keep your response concise (under 100 words unless more detail is needed)
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

