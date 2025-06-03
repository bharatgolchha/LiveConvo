import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let sessionId: string | undefined;
  let updateType: string | undefined;
  
  try {
    const body = await request.json();
    const { 
      previousSummary, 
      newTranscript, 
      fullTranscript, 
      sessionId: sid, 
      conversationType,
      updateType: ut 
    } = body;
    
    sessionId = sid;
    updateType = ut;

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY not found in environment');
      throw new Error('API key not configured');
    }

    // For incremental updates with existing summary
    if (updateType === 'incremental' && previousSummary && newTranscript) {
      const systemPrompt = `You are an expert conversation analyst performing incremental summary updates.

PREVIOUS SUMMARY:
${JSON.stringify(previousSummary, null, 2)}

Your task is to UPDATE the summary based on NEW conversation content. Follow these rules:
1. MERGE new information with existing summary
2. PRESERVE important information from the previous summary
3. UPDATE metrics and counts (don't just append)
4. REMOVE outdated information
5. MAINTAIN the same JSON structure

Focus on:
- Adding new key points, decisions, and action items
- Updating the TLDR if the conversation direction changed
- Adjusting sentiment and progress status
- Consolidating similar points (don't duplicate)

Return ONLY valid JSON with the same structure as before.`;

      const userPrompt = `NEW CONVERSATION CONTENT:
${newTranscript}

Update the summary to incorporate this new information.`;

      console.log('📝 Processing incremental summary update');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        console.error('❌ OpenRouter API error:', response.status);
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Incremental update successful');
      
      let summaryData = JSON.parse(data.choices[0].message.content);
      
      // Ensure all fields exist
      summaryData = {
        tldr: summaryData.tldr || previousSummary.tldr,
        keyPoints: summaryData.keyPoints || previousSummary.keyPoints || [],
        decisions: summaryData.decisions || previousSummary.decisions || [],
        actionItems: summaryData.actionItems || previousSummary.actionItems || [],
        nextSteps: summaryData.nextSteps || previousSummary.nextSteps || [],
        topics: summaryData.topics || previousSummary.topics || [],
        sentiment: summaryData.sentiment || previousSummary.sentiment || 'neutral',
        progressStatus: summaryData.progressStatus || previousSummary.progressStatus || 'making_progress',
        suggestedChecklistItems: summaryData.suggestedChecklistItems || []
      };

      return NextResponse.json({
        summary: summaryData,
        generatedAt: new Date().toISOString(),
        sessionId,
        updateType: 'incremental'
      });
      
    } else {
      // Fall back to full generation
      console.log('📝 Falling back to full summary generation');
      
      // Convert transcript to text
      let transcriptText = '';
      if (Array.isArray(fullTranscript)) {
        transcriptText = fullTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      } else if (typeof fullTranscript === 'string') {
        transcriptText = fullTranscript;
      } else {
        throw new Error('Invalid transcript format');
      }

      // Use the same system prompt as summary-v2
      const systemPrompt = `You are an expert conversation analyst. Analyze the conversation transcript and provide a comprehensive summary.

CRITICAL: You MUST respond with valid JSON using this EXACT structure. Do not include any text before or after the JSON.

{
  "tldr": "Brief 1-2 sentence summary of the conversation",
  "keyPoints": ["Specific point 1", "Specific point 2", "Specific point 3"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Actionable item 1", "Actionable item 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": "positive|negative|neutral",
  "progressStatus": "just_started|building_momentum|making_progress|wrapping_up",
  "suggestedChecklistItems": []
}

Focus on extracting concrete, actionable information. Return only valid JSON.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please analyze this conversation transcript and provide a summary:\n\n${transcriptText}` }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const summaryData = JSON.parse(data.choices[0].message.content);

      return NextResponse.json({
        summary: summaryData,
        generatedAt: new Date().toISOString(),
        sessionId,
        updateType: 'full'
      });
    }

  } catch (error) {
    console.error('❌ Summary API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      updateType
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate summary',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack trace') : undefined
      },
      { status: 500 }
    );
  }
}