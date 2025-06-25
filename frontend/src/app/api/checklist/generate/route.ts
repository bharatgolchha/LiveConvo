import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig'
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { message, sessionId, conversationType } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }

    // Check for API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY environment variable is not set')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const model = await getAIModelForAction(AIAction.CHECKLIST)
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
            content: `You are an AI assistant that extracts actionable checklist items from conversation guidance.

${getCurrentDateContext()}
            
            Your task is to analyze the given message and create 1-5 specific, actionable checklist items.
            
            Guidelines:
            - Extract clear, actionable tasks that can be checked off
            - Each item should be concise (max 100 characters)
            - Focus on specific actions, not vague suggestions
            - Include relevant details (e.g., names, timeframes) when mentioned
            - Prioritize items based on importance and urgency
            - For each item, assign a type: preparation, followup, research, decision, or action
            - For each item, assign a priority: high, medium, or low
            
            ${conversationType ? `Context: This is from a ${conversationType} conversation.` : ''}
            
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
            
            Important: Return ONLY the JSON object, no additional text or formatting.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.3,
        max_tokens: 500
        // Removed response_format as it may not be supported by all models
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
        error: 'Failed to generate checklist items',
        details: errorData.error || errorData.message || 'Unknown error'
      }, { status: 500 })
    }

    const aiResponse = await openRouterResponse.json()
    const content = aiResponse.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    try {
      const parsedContent = JSON.parse(content)
      const checklistItems = parsedContent.items || []
      
      // Validate and clean the items
      const validItems = checklistItems
        .filter((item: any) => item.text && item.text.trim().length > 0)
        .slice(0, 5) // Max 5 items
        .map((item: any) => ({
          text: item.text.trim().substring(0, 100),
          priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          type: ['preparation', 'followup', 'research', 'decision', 'action'].includes(item.type) ? item.type : 'action'
        }))

      return NextResponse.json({ items: validItems })
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating checklist items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}