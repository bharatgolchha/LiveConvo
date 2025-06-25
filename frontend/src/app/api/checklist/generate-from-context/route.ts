import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SmartNoteGenerationItem, PreviousSession } from '@/types/api'
import { getDefaultAiModelServer } from '@/lib/systemSettingsServer'
import { getCurrentDateContext } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { 
      sessionId, 
      conversationType, 
      title, 
      contextText, 
      previousConversationIds,
      transcript 
    } = await request.json()

    if (!sessionId || !conversationType || !title) {
      return NextResponse.json({ 
        error: 'sessionId, conversationType, and title are required' 
      }, { status: 400 })
    }

    // Check for API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY environment variable is not set')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // Fetch previous conversations if provided
    let previousConversationContext = ''
    if (previousConversationIds && previousConversationIds.length > 0) {
      const { data: previousSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('title, conversation_type, context')
        .in('id', previousConversationIds)
        .eq('user_id', user.id)

      if (!sessionsError && previousSessions) {
        previousConversationContext = (previousSessions as PreviousSession[])
          .map(s => `- ${s.title} (${s.conversation_type}): ${s.context?.text || 'No context'}`)
          .join('\n')
      }
    }

    // Build comprehensive context for AI
    const aiContext = `
Conversation Type: ${conversationType}
Title: ${title}
${contextText ? `Background Context: ${contextText}` : ''}
${previousConversationContext ? `\nPrevious Related Conversations:\n${previousConversationContext}` : ''}
${transcript ? `\nCurrent Conversation Transcript:\n${transcript}` : ''}
    `.trim()

    // Prepare conversation type specific prompts
    const conversationTypePrompts: Record<string, string> = {
      sales_call: 'Focus on discovery questions, value propositions, objection handling, and next steps.',
      interview: 'Focus on candidate assessment, technical questions, behavioral questions, and evaluation criteria.',
      meeting: 'Focus on agenda items, action items, decisions to be made, and follow-ups.',
      consultation: 'Focus on client needs assessment, solution recommendations, implementation steps, and deliverables.',
    }

    const typeSpecificPrompt = conversationTypePrompts[conversationType] || 'Focus on key discussion points and action items.'

    const model = await getDefaultAiModelServer();
    let openRouterResponse;
    try {
      openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'liveprompt.ai AI Checklist Generator'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant that generates actionable smart notes for conversations based on all available context.

${getCurrentDateContext()}
              
              Your task is to analyze the conversation context (including any transcript from an ongoing conversation) and create 5-10 specific, actionable smart notes that will help the user.
              
              Guidelines:
              - Create clear, insightful notes that capture important information
              - Each note should be concise (max 100 characters)
              - If a transcript is provided, analyze what has been discussed and create relevant notes
              - If no transcript is provided, focus on preparation notes
              - ${typeSpecificPrompt}
              - Include items for before, during, and after the conversation
              - Prioritize items based on importance and timing
              - For each item, assign a type: preparation, followup, research, decision, or action
              - For each item, assign a priority: high, medium, or low
              - Consider any background context, previous conversations, and current transcript
              - Be specific - reference actual topics, names, or issues mentioned in the context/transcript
              
              Return your response as valid JSON with this exact structure:
              {
                "items": [
                  {
                    "text": "Specific actionable task",
                    "priority": "high|medium|low",
                    "type": "preparation|followup|research|decision|action"
                  }
                ]
              }
              
              Important: Return ONLY the JSON object, no additional text, no markdown formatting, no code blocks. Just the raw JSON.`
            },
            {
              role: 'user',
              content: `Generate comprehensive smart notes for this conversation:\n\n${aiContext}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })
    } catch (fetchError) {
      console.error('Failed to fetch from OpenRouter:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to connect to AI service',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, { status: 500 })
    }

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json()
      console.error('OpenRouter API error:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        error: errorData
      })
      return NextResponse.json({ 
        error: 'Failed to generate smart notes',
        details: errorData.error || errorData.message || 'Unknown error'
      }, { status: 500 })
    }

    const aiResponse = await openRouterResponse.json()
    const content = aiResponse.choices[0]?.message?.content

    if (!content) {
      console.error('No content in AI response:', aiResponse)
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Log the raw content for debugging
    console.log('Raw AI response content:', content)

    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedContent = JSON.parse(cleanContent)
      const checklistItems = parsedContent.items || []
      
      // Validate and clean the items
      const validItems: SmartNoteGenerationItem[] = checklistItems
        .filter((item: SmartNoteGenerationItem) => item.text && item.text.trim().length > 0)
        .slice(0, 10) // Max 10 items
        .map((item: SmartNoteGenerationItem) => ({
          text: item.text.trim().substring(0, 100),
          priority: (['high', 'medium', 'low'] as const).includes(item.priority) ? item.priority : 'medium',
          type: (['preparation', 'followup', 'research', 'decision', 'action'] as const).includes(item.type) ? item.type : 'action'
        }))

      // Save the generated items to the database
      if (validItems.length > 0) {
        console.log('💾 Saving', validItems.length, 'items to database for session:', sessionId)
        
        // Insert items into prep_checklist table
        const { data, error: insertError } = await supabase
          .from('prep_checklist')
          .insert(
            validItems.map((item: SmartNoteGenerationItem) => ({
              session_id: sessionId,
              created_by: user.id,
              text: item.text,
              status: 'open'
            }))
          )
          .select()

        if (insertError) {
          console.error('❌ Failed to save checklist items:', insertError)
          // Still return the items even if saving failed
        } else {
          console.log('✅ Successfully saved', data?.length || 0, 'checklist items to database')
        }
      }

      return NextResponse.json({ 
        items: validItems,
        message: `Generated ${validItems.length} checklist items based on conversation context`
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Content that failed to parse:', content)
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating checklist items from context:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}