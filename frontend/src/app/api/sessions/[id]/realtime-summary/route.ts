import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';

const requestSchema = z.object({
  transcript: z.array(z.object({
    id: z.string().optional(),
    speaker: z.string().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    displayName: z.string().optional(),
    isOwner: z.boolean().optional(),
    timestamp: z.string().optional(),
    timeSeconds: z.number().optional()
  })),
  totalMessageCount: z.number().optional(),
  participantMe: z.string().optional(),
  participantThem: z.string().optional(),
  conversationType: z.string().optional()
});

interface TranscriptMessage {
  id?: string;
  speaker?: string;
  text?: string;
  content?: string;
  displayName?: string;
  isOwner?: boolean;
  timestamp?: string;
  timeSeconds?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Validate sessionId
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    // Verify user has access to this session
    try {
      const authClient = createAuthenticatedSupabaseClient(token);
      const { data: session, error: sessionError } = await authClient
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to this session' },
          { status: 403 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    console.log('🔍 API Request received:', {
      sessionId,
      bodyKeys: Object.keys(body),
      hasTranscript: Array.isArray(body.transcript),
      transcriptLength: body.transcript?.length || 0
    });
    
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      console.error('❌ Schema validation failed:', {
        errors: parsed.error.flatten(),
        receivedBody: body
      });
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: parsed.error.flatten(),
        received: Object.keys(body)
      }, { status: 400 });
    }

    const {
      transcript,
      totalMessageCount = 0,
      participantMe = 'You',
      participantThem = 'Them',
      conversationType = 'meeting'
    } = parsed.data;

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript content provided' }, { status: 400 });
    }

    // Debug log the incoming messages
    console.log('🔍 API Debug - Incoming transcript:', {
      sessionId,
      transcriptLength: transcript.length,
      sampleMessage: transcript[0] ? {
        id: transcript[0].id,
        speaker: transcript[0].speaker,
        text: transcript[0].text?.substring(0, 100) + '...',
        hasText: !!transcript[0].text,
        hasDisplayName: !!transcript[0].displayName
      } : 'No messages'
    });

    // Convert transcript to text format - filter out empty/invalid messages
    const validMessages = transcript.filter((msg: TranscriptMessage) => 
      msg && msg.text && msg.text.trim().length > 0
    );
    
    if (validMessages.length === 0) {
      return NextResponse.json({ error: 'No valid transcript content found in messages' }, { status: 400 });
    }

    // Improved speaker name resolution
    const transcriptText = validMessages
      .map((msg: TranscriptMessage) => {
        let speakerName = participantThem; // Default fallback
        
        // Priority order for speaker identification:
        // 1. Use displayName if available (from Recall.ai or other sources)
        // 2. Check if speaker is 'ME', 'user', or indicates the session owner
        // 3. Check isOwner flag if available
        // 4. Use the speaker field directly if it's a meaningful name
        // 5. Fall back to participant names
        
        if (msg.displayName && msg.displayName.trim().length > 0) {
          speakerName = msg.displayName.trim();
        } else if (msg.speaker === 'ME' || msg.speaker === 'user' || msg.isOwner === true) {
          speakerName = participantMe;
        } else if (msg.speaker && 
                   msg.speaker !== 'user' && 
                   msg.speaker !== 'participant' && 
                   msg.speaker !== 'speaker' &&
                   msg.speaker.trim().length > 0) {
          // Use speaker field if it contains a meaningful name (not generic identifiers)
          speakerName = msg.speaker.trim();
        }
        
        return `${speakerName}: ${msg.text || msg.content || ''}`.trim();
      })
      .join('\n');

    console.log('🔍 API Debug - Processed transcript:', {
      originalCount: transcript.length,
      validCount: validMessages.length,
      transcriptPreview: transcriptText.substring(0, 200) + '...',
      speakerMapping: {
        participantMe,
        participantThem,
        sampleSpeakers: validMessages.slice(0, 3).map((msg: TranscriptMessage) => ({
          original: msg.speaker,
          displayName: msg.displayName,
          isOwner: msg.isOwner,
          resolved: msg.displayName || 
                   (msg.speaker === 'ME' || msg.speaker === 'user' || msg.isOwner === true ? participantMe : 
                   (msg.speaker && msg.speaker !== 'user' && msg.speaker !== 'participant' && msg.speaker !== 'speaker' ? msg.speaker : participantThem))
        }))
      }
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY' },
        { status: 500 }
      );
    }

    const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);

    // Simple prompt for analyzing the full transcript
    const systemPrompt = `You are a helpful AI assistant that analyzes a live ${conversationType} conversation between ${participantMe} and ${participantThem}. 

${getCurrentDateContext()}

Analyze the entire transcript and create a comprehensive summary in the JSON format below. 

Focus on:
- TL;DR of what has been discussed
- Key discussion points and insights
- Any action items or decisions made
- Main topics covered
- Overall conversation sentiment and progress

Return ONLY valid JSON without markdown or extra text. Required JSON format:
{
  "tldr": "Brief summary of the conversation",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "decisions": ["Decision 1"],
  "topics": ["Topic 1", "Topic 2"]
}`;

    const userPrompt = `Analyze this ${conversationType} conversation between ${participantMe} and ${participantThem}:

Total messages: ${validMessages.length}

Full Transcript:
${transcriptText}`;

    console.log('🤖 Summary generation request:', {
      sessionId,
      validMessagesCount: validMessages.length,
      totalMessageCount,
      model,
      transcriptLength: transcriptText.length
    });

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-realtime-summary'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error('OpenRouter error:', openRouterResponse.status, errText);
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again later.' },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    let summaryJson: {
      tldr?: string;
      keyPoints?: string[];
      actionItems?: string[];
      decisions?: string[];
      topics?: string[];
    };
    
    try {
      summaryJson = JSON.parse(data.choices[0].message.content.trim());
    } catch (err) {
      console.error('Failed to parse AI JSON:', err);
      console.error('Raw response:', data.choices[0].message.content);
      
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Ensure required fields exist with fallbacks
    const responsePayload = {
      tldr: summaryJson.tldr || 'Conversation in progress',
      keyPoints: Array.isArray(summaryJson.keyPoints) ? summaryJson.keyPoints : [],
      actionItems: Array.isArray(summaryJson.actionItems) ? summaryJson.actionItems : [],
      decisions: Array.isArray(summaryJson.decisions) ? summaryJson.decisions : [],
      topics: Array.isArray(summaryJson.topics) ? summaryJson.topics : []
    };

    console.log('✅ Summary generated successfully:', {
      transcriptLength: validMessages.length,
      tldrLength: responsePayload.tldr.length,
      keyPointsCount: responsePayload.keyPoints.length,
      actionItemsCount: responsePayload.actionItems.length,
      decisionsCount: responsePayload.decisions.length,
      topicsCount: responsePayload.topics.length
    });

    return NextResponse.json(responsePayload);
    
  } catch (err) {
    console.error('Unexpected error generating realtime summary:', err);
    
    // Provide detailed error response
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      }, 
      { status: 500 }
    );
  }
} 