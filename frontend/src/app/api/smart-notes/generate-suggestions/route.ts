import { NextRequest, NextResponse } from 'next/server';
import type { SuggestedSmartNote } from '@/types/api';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
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
    const { transcript, sessionId, conversationType, summary, participantMe, participantThem } = await request.json();

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate smart notes' },
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
        { error: 'Unauthorized', message: 'Please sign in to generate smart notes' },
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

    // Build context from transcript and summary
    let context = `Conversation Type: ${conversationType || 'general'}\n\n`;
    
    if (summary) {
      context += `Summary:\n${summary.tldr}\n\n`;
      if (summary.keyPoints?.length > 0) {
        context += `Key Points:\n${summary.keyPoints.join('\n')}\n\n`;
      }
      if (summary.decisions?.length > 0) {
        context += `Decisions:\n${summary.decisions.join('\n')}\n\n`;
      }
      if (summary.actionItems?.length > 0) {
        context += `Action Items:\n${summary.actionItems.join('\n')}\n\n`;
      }
    }
    
    context += `Transcript:\n${transcript}`;

    const meLabel = participantMe || 'You';
    const themLabel = participantThem || 'The other participant';
    
    const systemPrompt = `You are an expert AI assistant that analyzes conversation transcripts and generates actionable smart notes to help participants track important insights, decisions, and follow-up actions.

${getCurrentDateContext()}

Your role is to extract the most valuable, actionable insights from the conversation that the user should remember, act on, or reference later.

ANALYSIS FOCUS:
- Key decisions made during the conversation
- Important insights or revelations shared
- Action items or commitments mentioned
- Critical information that affects future planning
- Strategic points worth remembering
- Questions that need follow-up

SMART NOTES CRITERIA:
1. **Actionable**: Each note should relate to something the user can act on
2. **Specific**: Include names, dates, numbers, or concrete details when mentioned
3. **Valuable**: Focus on high-impact information that matters for future reference
4. **Concise**: Keep each note under 100 characters for easy scanning
5. **Categorized**: Assign appropriate types and priorities

CATEGORIES:
- preparation: Things to prepare for future conversations/meetings
- followup: Actions to take after this conversation
- research: Information to investigate or validate
- decision: Important decisions made or needed
- action: Specific tasks or commitments

PRIORITIES:
- high: Critical items that need immediate attention
- medium: Important items for near-term action
- low: Useful information for future reference

${participantMe && participantThem ? `
PARTICIPANTS:
- "${participantMe}" = The user requesting these smart notes
- "${participantThem}" = The person they were speaking with

Frame all notes from ${participantMe}'s perspective - what they should know, do, or remember.` : ''}

Return ONLY the JSON object. Ensure all strings are properly quoted and escaped.`;

    const model = await getAIModelForAction(AIAction.SMART_NOTES);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveprompt.ai Smart Notes Suggestions',
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
            content: `Generate smart note suggestions for this conversation:\n\n${context}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
    
    let suggestionsData;
    try {
      const rawContent = data.choices[0].message.content.trim();
      console.log('Raw suggestions content:', rawContent.substring(0, 200) + '...');
      
      suggestionsData = JSON.parse(rawContent);
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      
      // Return empty suggestions on parse error
      return NextResponse.json({ suggestions: [] });
    }
    
    // Validate and format suggestions
    const validatedSuggestions: SuggestedSmartNote[] = (suggestionsData.suggestions || [])
      .filter((item: any) => 
        item && 
        typeof item.text === 'string' && 
        item.text.trim().length > 0 &&
        ['high', 'medium', 'low'].includes(item.priority) &&
        ['preparation', 'followup', 'research', 'decision', 'action'].includes(item.type) &&
        typeof item.relevance === 'number' && 
        item.relevance >= 0 && 
        item.relevance <= 100
      )
      .map((item: any) => ({
        text: item.text.trim().substring(0, 80),
        priority: item.priority as 'high' | 'medium' | 'low',
        type: item.type as 'preparation' | 'followup' | 'research' | 'decision' | 'action',
        relevance: Math.min(100, Math.max(0, item.relevance))
      }))
      .slice(0, 8); // Max 8 suggestions
    
    return NextResponse.json({ suggestions: validatedSuggestions });

  } catch (error) {
    console.error('Smart notes suggestions API error:', error);
    return NextResponse.json(
      { error: 'Unable to generate suggestions. Please try again later.' },
      { status: 500 }
    );
  }
}