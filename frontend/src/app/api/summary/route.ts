import { NextRequest, NextResponse } from 'next/server';
import type { RealtimeSummary, SuggestedChecklistItem, SummaryResponse } from '@/types/api';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';
import JSON5 from 'json5';

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
    const { transcript, sessionId, conversationType, includeLinked } = await request.json();

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
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
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

    const systemPrompt = `You are an expert conversation analyst. Analyze the transcript and provide a summary in the EXACT JSON format below.

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.

REQUIRED JSON FORMAT:
{
  "tldr": "Brief 1-2 sentence summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "decisions": ["Decision 1"],
  "actionItems": ["Action 1"],
  "nextSteps": ["Next step 1"],
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": "positive",
  "progressStatus": "building_momentum",
  "suggestedChecklistItems": []
}

FIELD RULES:
- tldr: 1-2 sentences max
- keyPoints: 3-5 main discussion points (required)
- decisions: Actual decisions made (can be empty array)
- actionItems: Specific tasks identified (can be empty array)
- nextSteps: Clear next actions (can be empty array)  
- topics: Main subjects discussed (1-3 topics)
- sentiment: Must be "positive", "negative", or "neutral"
- progressStatus: Must be "just_started", "building_momentum", "making_progress", or "wrapping_up"
- suggestedChecklistItems: Leave as empty array for now

Return ONLY the JSON object. Ensure all strings are properly quoted and escaped.`;

    const model = await getDefaultAiModelServer();

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
            content: `Analyze this conversation and return the summary as JSON:\n\n${transcriptText}`
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
        progressStatus: 'building_momentum',
        suggestedChecklistItems: []
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
      progressStatus: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up'].includes(summaryData.progressStatus) ? summaryData.progressStatus : 'building_momentum',
      suggestedChecklistItems: Array.isArray(summaryData.suggestedChecklistItems) ? summaryData.suggestedChecklistItems.filter((item: SuggestedChecklistItem) => 
        item && 
        typeof item.text === 'string' && 
        (['high', 'medium', 'low'] as const).includes(item.priority) &&
        (['preparation', 'followup', 'research', 'decision', 'action'] as const).includes(item.type) &&
        typeof item.relevance === 'number' && 
        item.relevance >= 0 && 
        item.relevance <= 100
      ) : []
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
