import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer';

const requestSchema = z.object({
  totalMessageCount: z.number().optional(),
  lastProcessedIndex: z.number(),
  newMessages: z.array(z.any()),
  existingSummary: z.object({
    tldr: z.string(),
    keyPoints: z.array(z.string()),
    actionItems: z.array(z.string()),
    decisions: z.array(z.string()),
    topics: z.array(z.string()),
    lastUpdated: z.string()
  }).optional(),
  isInitialSummary: z.boolean(),
  participantMe: z.string().optional(),
  participantThem: z.string().optional(),
  conversationType: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    
    console.log('🔍 API Request received:', {
      sessionId,
      bodyKeys: Object.keys(body),
      hasNewMessages: Array.isArray(body.newMessages),
      newMessagesLength: body.newMessages?.length || 0
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
      totalMessageCount = 0,
      lastProcessedIndex,
      newMessages,
      existingSummary,
      isInitialSummary,
      participantMe = 'You',
      participantThem = 'Them',
      conversationType = 'meeting'
    } = parsed.data;

    if (!Array.isArray(newMessages) || newMessages.length === 0) {
      return NextResponse.json({ error: 'No new transcript content provided' }, { status: 400 });
    }

    // Debug log the incoming messages
    console.log('🔍 API Debug - Incoming messages:', {
      sessionId,
      newMessagesCount: newMessages.length,
      sampleMessage: newMessages[0] ? {
        id: newMessages[0].id,
        speaker: newMessages[0].speaker,
        text: newMessages[0].text?.substring(0, 100) + '...',
        hasText: !!newMessages[0].text,
        hasDisplayName: !!newMessages[0].displayName
      } : 'No messages',
      allMessageTypes: newMessages.map((msg, idx) => `${idx}: ${typeof msg} - hasText: ${!!msg?.text}`)
    });

    // Convert new messages to text format - filter out empty/invalid messages
    const validMessages = newMessages.filter(msg => msg && msg.text && msg.text.trim().length > 0);
    
    if (validMessages.length === 0) {
      return NextResponse.json({ error: 'No valid transcript content found in messages' }, { status: 400 });
    }

    const newTranscriptText = validMessages
      .map((msg: any) => {
        const speakerName = msg.speaker === 'ME' ? participantMe : (msg.displayName || msg.speaker || participantThem);
        return `${speakerName}: ${msg.text || msg.content || ''}`.trim();
      })
      .join('\n');

    console.log('🔍 API Debug - Processed transcript:', {
      originalCount: newMessages.length,
      validCount: validMessages.length,
      transcriptPreview: newTranscriptText.substring(0, 200) + '...'
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY' },
        { status: 500 }
      );
    }

    const model = await getDefaultAiModelServer();

    let systemPrompt: string;
    let userPrompt: string;

    if (isInitialSummary || !existingSummary) {
      // Initial summary generation - analyze all new messages from scratch
      systemPrompt = `You are a helpful AI assistant that analyzes a live ${conversationType} conversation between ${participantMe} and ${participantThem}. 

This is the INITIAL SUMMARY for this conversation. Analyze the transcript and create a comprehensive summary in the JSON format below. 

Focus on:
- TL;DR of what has been discussed so far
- Key discussion points and insights
- Any action items or decisions made
- Main topics covered
- Overall conversation sentiment and progress

Return ONLY valid JSON without markdown or extra text. Required JSON format:
{
  "tldr": "Brief summary of the conversation so far",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "decisions": ["Decision 1"],
  "topics": ["Topic 1", "Topic 2"]
}`;

      userPrompt = `Create an initial summary for this ${conversationType} conversation between ${participantMe} and ${participantThem}:

Messages processed: ${newMessages.length} (total conversation length: ${totalMessageCount})

Transcript:
${newTranscriptText}`;

    } else {
      // Incremental summary update - merge existing summary with new content
      systemPrompt = `You are a helpful AI assistant that updates an existing conversation summary with new transcript content.

You will receive:
1. An EXISTING SUMMARY from earlier in the conversation
2. NEW TRANSCRIPT CONTENT that occurred after the existing summary

Your task is to UPDATE the existing summary by incorporating the new information. CRITICAL REQUIREMENTS:

CONTENT PRESERVATION:
- PRESERVE all valuable information from the existing summary
- Keep existing key points that are still relevant
- Maintain existing action items and decisions (don't lose them)
- Keep existing topics and add new ones

INCREMENTAL BUILDING:
- Add NEW key points from the recent transcript while keeping important existing ones
- Add any NEW action items or decisions from the new content
- Update the TL;DR to reflect the FULL conversation including both previous and new developments
- Expand the topics list with any new subjects discussed
- Build upon the existing summary rather than replacing it

CONTINUITY FOCUS:
- The updated summary should feel like a natural evolution of the previous one
- Include context from both the existing summary and new content
- Ensure the TL;DR encompasses the entire conversation flow, not just the new part

Return ONLY valid JSON without markdown or extra text. Required JSON format:
{
  "tldr": "Updated summary that encompasses the FULL conversation from start to current point",
  "keyPoints": ["Preserved important existing points", "New insights from recent discussion"],
  "actionItems": ["Existing action items that are still relevant", "New action items from recent content"],
  "decisions": ["Previous decisions made", "New decisions from recent discussion"],
  "topics": ["Previous topics", "New topics from recent content"]
}`;

      userPrompt = `Update this conversation summary by BUILDING UPON the existing content with new transcript information:

EXISTING SUMMARY TO BUILD UPON (from messages 0-${lastProcessedIndex}):
Previous TL;DR: ${existingSummary.tldr}
Previous Key Points: ${existingSummary.keyPoints.join(' | ')}
Previous Action Items: ${existingSummary.actionItems.join(' | ')}
Previous Decisions: ${existingSummary.decisions.join(' | ')}
Previous Topics: ${existingSummary.topics.join(' | ')}

NEW TRANSCRIPT CONTENT TO INCORPORATE (messages ${lastProcessedIndex + 1}-${lastProcessedIndex + newMessages.length}):
${newTranscriptText}

CONVERSATION PROGRESS: ${totalMessageCount} total messages (${newMessages.length} new messages added)

Please update the summary by:
1. PRESERVING valuable content from the existing summary
2. ADDING new insights from the recent transcript
3. BUILDING a comprehensive TL;DR that covers the ENTIRE conversation
4. MAINTAINING continuity between previous and new content

The result should be an enhanced version of the existing summary, not a replacement.`;
    }

    console.log('🤖 Summary generation request:', {
      sessionId,
      isInitialSummary,
      lastProcessedIndex,
      newMessagesCount: newMessages.length,
      totalMessageCount,
      hasExistingSummary: !!existingSummary,
      model
    });

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-incremental-summary'
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
    let summaryJson: any;
    try {
      summaryJson = JSON.parse(data.choices[0].message.content.trim());
    } catch (err) {
      console.error('Failed to parse AI JSON:', err);
      console.error('Raw response:', data.choices[0].message.content);
      
      // Fallback to existing summary if update fails
      if (existingSummary && !isInitialSummary) {
        console.log('🔄 Falling back to existing summary due to parse error');
        return NextResponse.json({
          tldr: existingSummary.tldr,
          keyPoints: existingSummary.keyPoints,
          actionItems: existingSummary.actionItems,
          decisions: existingSummary.decisions,
          topics: existingSummary.topics
        });
      }
      
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Ensure required fields exist with fallbacks
    const responsePayload = {
      tldr: summaryJson.tldr || (existingSummary?.tldr || 'Conversation in progress'),
      keyPoints: Array.isArray(summaryJson.keyPoints) ? summaryJson.keyPoints : (existingSummary?.keyPoints || []),
      actionItems: Array.isArray(summaryJson.actionItems) ? summaryJson.actionItems : (existingSummary?.actionItems || []),
      decisions: Array.isArray(summaryJson.decisions) ? summaryJson.decisions : (existingSummary?.decisions || []),
      topics: Array.isArray(summaryJson.topics) ? summaryJson.topics : (existingSummary?.topics || [])
    };

    console.log('✅ Summary generated successfully:', {
      isInitialSummary,
      tldrLength: responsePayload.tldr.length,
      keyPointsCount: responsePayload.keyPoints.length,
      actionItemsCount: responsePayload.actionItems.length,
      decisionsCount: responsePayload.decisions.length,
      topicsCount: responsePayload.topics.length
    });

    return NextResponse.json(responsePayload);
    
  } catch (err) {
    console.error('Unexpected error generating realtime summary:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 