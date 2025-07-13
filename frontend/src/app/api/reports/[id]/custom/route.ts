import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get current user from auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized - Invalid authentication token' },
        { status: 401 }
      );
    }

    const authenticatedClient = createAuthenticatedSupabaseClient(token);

    // Fetch custom reports for this session
    const { data: reports, error } = await authenticatedClient
      .from('custom_reports')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error('Error in custom reports GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    
    console.log('Custom report generation request:', { sessionId, hasSharedToken: !!body.sharedToken });
    
    // Validate session ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: `Invalid session ID format: ${sessionId}` },
        { status: 400 }
      );
    }
    
    const { 
      prompt, 
      template, 
      includeTranscript = true, 
      includeSummary = true,
      includeActionItems = true,
      includeLinkedConversations = false,
      enableWebSearch = false,
      sharedToken
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Handle authentication - either token or shared access
    let userId: string | null = null;
    let authenticatedClient = supabase;

    if (!sharedToken) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - No authentication token provided' },
          { status: 401 }
        );
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Auth error in custom report POST:', authError);
        return NextResponse.json(
          { error: authError?.message || 'Unauthorized - Invalid authentication token' },
          { status: 401 }
        );
      }

      userId = user.id;
      authenticatedClient = createAuthenticatedSupabaseClient(token);
    } else {
      // Verify shared token
      const { data: shareData, error: shareError } = await supabase
        .from('report_shares')
        .select('*')
        .eq('share_token', sharedToken)
        .eq('session_id', sessionId)
        .single();

      if (shareError || !shareData) {
        return NextResponse.json(
          { error: 'Invalid share token' },
          { status: 403 }
        );
      }

      // Check if custom tab is included in shared tabs
      if (!shareData.shared_tabs.includes('custom')) {
        return NextResponse.json(
          { error: 'Custom reports not available in this shared report' },
          { status: 403 }
        );
      }

      // Check expiration
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Share link has expired' },
          { status: 403 }
        );
      }
    }

    // Fetch session data with summary and transcript
    let sessionQuery = authenticatedClient
      .from('sessions')
      .select(`
        *,
        summaries (
          tldr,
          key_decisions,
          action_items,
          follow_up_questions,
          conversation_highlights,
          structured_notes
        ),
        transcripts (
          speaker,
          content,
          start_time_seconds,
          sequence_number
        )
      `)
      .eq('id', sessionId);

    // Add user check only if not using shared token
    if (!sharedToken && userId) {
      sessionQuery = sessionQuery.eq('user_id', userId);
    }

    console.log('Fetching session with query:', { sessionId, userId, hasSharedToken: !!sharedToken });
    const { data: sessionData, error: sessionError } = await sessionQuery.single();

    if (sessionError || !sessionData) {
      console.error('Session fetch error:', { 
        sessionId, 
        userId, 
        error: sessionError,
        hasData: !!sessionData 
      });
      return NextResponse.json(
        { error: sessionError?.message || 'Session not found' },
        { status: 404 }
      );
    }

    // Build context for AI
    let context = `Meeting Information:
Title: ${sessionData.title || 'Untitled Meeting'}
Date: ${sessionData.created_at}
Participants: ${sessionData.participant_me || 'Speaker 1'} and ${sessionData.participant_them || 'Speaker 2'}
Duration: ${sessionData.recording_duration_seconds ? Math.round(sessionData.recording_duration_seconds / 60) + ' minutes' : 'Unknown'}

`;

    if (includeSummary && sessionData.summaries?.length > 0) {
      const summary = sessionData.summaries[0];
      context += `\nMeeting Summary:
${summary.tldr || 'No summary available'}

Key Decisions:
${Array.isArray(summary.key_decisions) ? summary.key_decisions.map((d: any) => `- ${typeof d === 'string' ? d : d.decision}`).join('\n') : 'None recorded'}

`;
    }

    if (includeActionItems && sessionData.summaries?.length > 0) {
      const summary = sessionData.summaries[0];
      context += `\nAction Items:
${Array.isArray(summary.action_items) ? summary.action_items.map((item: any) => {
        if (typeof item === 'string') return `- ${item}`;
        return `- ${item.description || item.action || item.task} ${item.owner ? `(Owner: ${item.owner})` : ''} ${item.dueDate || item.deadline ? `(Due: ${item.dueDate || item.deadline})` : ''}`;
      }).join('\n') : 'None recorded'}

`;
    }

    // Fetch and include linked conversations if requested
    if (includeLinkedConversations) {
      // Fetch linked session IDs from conversation_links table
      const { data: linkedSessions } = await authenticatedClient
        .from('conversation_links')
        .select('linked_session_id, session_id')
        .or(`session_id.eq.${sessionId},linked_session_id.eq.${sessionId}`);

      if (linkedSessions && linkedSessions.length > 0) {
        context += `\nLinked Conversations:\n`;
        
        // Get unique linked session IDs
        const linkedSessionIds = [...new Set(linkedSessions.map(link => 
          link.session_id === sessionId ? link.linked_session_id : link.session_id
        ))];

        // Fetch summaries for linked sessions
        for (const linkedId of linkedSessionIds) {
          const { data: linkedSession } = await authenticatedClient
            .from('sessions')
            .select(`
              title,
              created_at,
              summaries (
                tldr,
                key_decisions,
                action_items
              )
            `)
            .eq('id', linkedId)
            .single();

          if (linkedSession && linkedSession.summaries?.length > 0) {
            const linkedSummary = linkedSession.summaries[0];
            context += `\n### ${linkedSession.title || 'Untitled Session'} (${new Date(linkedSession.created_at).toLocaleDateString()})
TLDR: ${linkedSummary.tldr || 'No summary available'}
Key Decisions: ${Array.isArray(linkedSummary.key_decisions) ? linkedSummary.key_decisions.join('; ') : 'None'}
\n`;
          }
        }
      }
    }

    if (includeTranscript && sessionData.transcripts?.length > 0) {
      const sortedTranscripts = sessionData.transcripts.sort((a: any, b: any) => 
        a.sequence_number - b.sequence_number
      );
      
      context += `\nFull Transcript:
${sortedTranscripts.map((t: any) => `${t.speaker}: ${t.content}`).join('\n\n')}
`;
    }

    // Generate report using AI
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Use web search model if enabled, otherwise use configured model
    const model = enableWebSearch 
      ? 'openai/gpt-4o:online' 
      : await getAIModelForAction(AIAction.CUSTOM_REPORT);
    
    // Create the streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://liveprompt.ai',
              'X-Title': 'liveprompt.ai Custom Report'
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert report writer who creates professional, well-structured reports from meeting data.

${getCurrentDateContext()}

Your reports should be:
1. Well-organized with clear sections and markdown formatting
2. Professional and suitable for business communication  
3. Focused on delivering the specific information requested
4. Actionable and insightful
5. Formatted with proper headings (##), subheadings (###), bullet points, and emphasis

Always structure your reports with:
- A brief introduction or executive summary
- Main content sections based on the request
- Clear conclusions or next steps when appropriate
- Professional tone throughout

${enableWebSearch ? `\nYou have access to web search capabilities. When relevant to the report request:
- Search for current information, statistics, or recent developments
- Verify facts and provide up-to-date context
- Include relevant external references with proper citations
- Distinguish between information from the meeting and web-sourced content` : ''}

${includeLinkedConversations ? `\nThis report includes linked conversations. When referencing them:
- Clearly indicate which insights come from which conversation
- Synthesize common themes across conversations
- Note any progression or changes between related discussions` : ''}`
                },
                {
                  role: 'user',
                  content: `Based on the following meeting data, please ${prompt}

${context}`
                }
              ],
              max_tokens: 3000,
              temperature: 0.7,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`AI service error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          let fullContent = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    
                    if (content) {
                      fullContent += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }

          // Don't auto-save anymore - user will manually save if needed

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ complete: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Failed to generate report' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in custom report generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}