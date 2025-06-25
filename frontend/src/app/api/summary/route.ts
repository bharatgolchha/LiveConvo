import { NextRequest, NextResponse } from 'next/server';
import type { RealtimeSummary, SuggestedSmartNote, SummaryResponse } from '@/types/api';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import JSON5 from 'json5';
import { supabase } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';

const getContextSpecificGuidelines = (conversationType: string) => {
  switch (conversationType) {
    case 'sales':
      return `
SALES-SPECIFIC SUGGESTIONS:
- Follow-up calls and demos
- Proposal and contract preparation
- Client research and needs analysis
- Pricing and negotiation preparation
- CRM updates and pipeline management`;
    
    case 'meeting':
      return `
MEETING-SPECIFIC SUGGESTIONS:
- Action item assignments
- Follow-up meetings and check-ins
- Document sharing and preparation
- Decision implementation steps
- Meeting notes distribution`;
    
    case 'interview':
      return `
INTERVIEW-SPECIFIC SUGGESTIONS:
- Thank you note sending
- Reference checks and follow-ups
- Skills assessment and preparation
- Company research and culture fit
- Next round preparation`;
    
    default:
      return `
GENERAL SUGGESTIONS:
- Task follow-ups and assignments
- Information gathering and research
- Decision points and deadlines
- Communication and coordination
- Documentation and record keeping`;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType, includeLinked, participantMe, participantThem } = await request.json();

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate summaries' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate summaries' },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const transcriptText = Array.isArray(transcript) 
      ? transcript.map(t => {
          const speakerName = t.speaker === 'ME' ? (participantMe || 'You') : (participantThem || 'Them');
          return `${speakerName}: ${t.text}`;
        }).join('\n')
      : transcript;

    // Fetch memory summaries for linked conversations if requested
    let linkedSummariesPrompt = '';
    if (includeLinked && sessionId) {
      try {
        // Create authenticated supabase client with token (already have above)
        const { data: links, error: linksError } = await authClient
          .from('conversation_links')
          .select('linked_session_id')
          .eq('session_id', sessionId);

        if (!linksError && links && links.length > 0) {
          const linkedIds = links.map((l: any) => l.linked_session_id);

          // Fetch latest summary for each linked session
          const { data: summaries, error: summariesError } = await authClient
            .from('summaries')
            .select('session_id, title, tldr, key_decisions, created_at')
            .in('session_id', linkedIds)
            .order('created_at', { ascending: false });

          if (!summariesError && summaries && summaries.length > 0) {
            // Keep only the latest summary per session
            const latestBySession = new Map<string, any>();
            summaries.forEach((s: any) => {
              if (!latestBySession.has(s.session_id)) {
                latestBySession.set(s.session_id, s);
              }
            });

            linkedSummariesPrompt = Array.from(latestBySession.values()).map((s: any, idx: number) => {
              const tldr = s.tldr || '';
              const keyPoints = Array.isArray(s.key_decisions) ? s.key_decisions.slice(0, 5).join('; ') : '';
              return `\n${idx + 1}. ${s.title || 'Untitled'}\nTL;DR: ${tldr}\nKey Points: ${keyPoints}`;
            }).join('\n');
          }
        }
      } catch (err) {
        console.error('Error fetching linked summaries:', err);
      }
    }

    const meLabel = participantMe || 'You';
    const themLabel = participantThem || 'The other participant';
    
    const systemPrompt = `You are an expert conversation analyst who creates detailed, comprehensive meeting summaries.

${getCurrentDateContext()}

Your task is to analyze this ${conversationType || 'conversation'} between ${meLabel} and ${themLabel} and provide a thorough, structured summary that captures all the important elements.

PARTICIPANTS CLEARLY IDENTIFIED:
- "${meLabel}" = The person who recorded this conversation (the user requesting this summary)
- "${themLabel}" = The person ${meLabel} was speaking with

ANALYSIS FRAMEWORK:
1. **Conversation Overview**: What was this conversation about? What were the main goals or purposes?
2. **Key Discussion Points**: What were the most important topics discussed between ${meLabel} and ${themLabel}?
3. **Decisions Made**: What decisions, agreements, or conclusions were reached?
4. **Action Items**: What specific actions, tasks, or follow-ups were identified?
5. **Key Insights**: What important insights, concerns, or opportunities emerged?
6. **Communication Dynamics**: How did the conversation flow? What was the tone and engagement level?

QUALITY STANDARDS:
- Be comprehensive but concise - capture everything important without unnecessary detail
- Reference both ${meLabel} and ${themLabel} by name when discussing their contributions
- Use specific quotes or examples from the conversation when they illustrate key points
- Organize information logically with clear sections
- Focus on actionable insights and outcomes
- Maintain professional, objective tone throughout

Return your analysis as a JSON object with this exact structure:
{
  "tldr": "2-3 sentence executive summary of the entire conversation",
  "key_discussion_points": [
    "Specific topic or theme discussed (3-8 items)"
  ],
  "decisions_made": [
    "Specific decision, agreement, or conclusion reached (0-5 items)"
  ],
  "action_items": [
    "Specific task, follow-up, or next step identified (0-8 items)"
  ],
  "key_insights": [
    "Important insight, concern, opportunity, or strategic point (2-6 items)"
  ],
  "conversation_highlights": [
    "Notable moments, quotes, or exchanges that were particularly important (2-5 items)"
  ],
  "overall_sentiment": "positive|neutral|mixed|concerning - with brief explanation",
  "meeting_effectiveness": "Brief assessment of how productive the conversation was",
  "recommended_follow_up": "Suggested next steps or follow-up actions based on the conversation"
}

IMPORTANT: Use the participant names (${meLabel} and ${themLabel}) throughout your analysis, not generic terms like "participant" or "speaker".`;

    const model = await getAIModelForAction(AIAction.SUMMARY);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveprompt.ai Summary',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this ${conversationType || 'general'} conversation between ${meLabel} and ${themLabel} and return the summary as JSON:\n\n${transcriptText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'The AI service is currently unavailable. Please try again later.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.debug('Summary model response received', {
      length: data.choices[0].message.content.length,
      finishReason: data.choices[0].finish_reason
    });
    
    let summaryData;
    try {
      const rawContent = data.choices[0].message.content.trim();
      console.log('Raw content to parse:', rawContent.substring(0, 500) + (rawContent.length > 500 ? '...' : ''));
      
      // Check if response was truncated
      if (data.choices[0].finish_reason === 'length') {
        console.warn('⚠️ Response was truncated due to token limit');
        
        // Try to complete the JSON if it was cut off
        let fixedContent = rawContent;
        if (!rawContent.endsWith('}')) {
          // Find the last complete field and close the JSON
          const lastCompleteField = rawContent.lastIndexOf('",');
          if (lastCompleteField > 0) {
            fixedContent = rawContent.substring(0, lastCompleteField + 1) + '\n}';
            console.log('🔧 Attempted to fix truncated JSON');
          }
        }
        
        try {
          summaryData = JSON.parse(fixedContent);
          console.log('✅ Successfully parsed fixed JSON');
        } catch (fixError) {
          console.error('❌ Failed to fix truncated JSON:', fixError);
          throw fixError;
        }
      } else {
        // Normal parsing
        const cleanContent = rawContent.replace(/```json\n?|```\n?/g, '');
        summaryData = JSON.parse(cleanContent);
        console.log('✅ Successfully parsed JSON');
      }
      
      console.log('📊 Parsed Summary Data:', {
        hasTldr: !!summaryData.tldr,
        keyPointsCount: summaryData.keyPoints?.length || 0,
        decisionsCount: summaryData.decisions?.length || 0,
        actionItemsCount: summaryData.actionItems?.length || 0,
        sentiment: summaryData.sentiment,
        progressStatus: summaryData.progressStatus
      });
      
    } catch (parseError) {
      console.error('💥 JSON Parse Error:', parseError);
      console.error('🔍 Raw content that failed:', data.choices[0].message.content);
      
      // Create a fallback summary
      summaryData = {
        tldr: 'Summary generation encountered a formatting issue. The conversation was analyzed but the detailed breakdown is not available.',
        keyPoints: ['Conversation analysis completed'],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: ['General conversation'],
        sentiment: 'neutral',
        progressStatus: 'building_momentum'
      };
    }
    
    // Validate and ensure all required fields exist
    const validatedSummary: RealtimeSummary = {
      tldr: summaryData.tldr || 'No summary available',
      keyPoints: Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints : [],
      decisions: Array.isArray(summaryData.decisions) ? summaryData.decisions : [],
      actionItems: Array.isArray(summaryData.actionItems) ? summaryData.actionItems : [],
      nextSteps: Array.isArray(summaryData.nextSteps) ? summaryData.nextSteps : [],
      topics: Array.isArray(summaryData.topics) ? summaryData.topics : ['General'],
      sentiment: ['positive', 'negative', 'neutral'].includes(summaryData.sentiment) ? summaryData.sentiment : 'neutral',
      progressStatus: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up'].includes(summaryData.progressStatus) ? summaryData.progressStatus : 'building_momentum'
    };
    
    // Return in the expected format for useRealtimeSummary hook
    const responseData: SummaryResponse = {
      summary: validatedSummary,
      generatedAt: new Date().toISOString(),
    };
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: 'Unable to generate summary. Please try again later.' },
      { status: 500 }
    );
  }
}
