import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedServerClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = await createAuthenticatedServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { message, sessionId, conversationType } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Gemini API key not found')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string'
                    },
                    priority: {
                      type: 'string',
                      enum: ['high', 'medium', 'low']
                    },
                    type: {
                      type: 'string',
                      enum: ['preparation', 'followup', 'research', 'decision', 'action']
                    }
                  },
                  required: ['text', 'priority', 'type']
                },
                maxItems: 5
              }
            },
            required: ['items']
          },
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })

      const prompt = `You are an AI assistant that extracts actionable checklist items from conversation guidance.
            
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

Analyze this message and extract actionable checklist items:
${message}`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const responseText = response.text()

      const parsedContent = JSON.parse(responseText)
      const checklistItems = parsedContent.items || []
      
      // Validate and clean the items
      const validItems = checklistItems
        .filter(item => item.text && item.text.trim().length > 0)
        .slice(0, 5) // Max 5 items
        .map(item => ({
          text: item.text.trim().substring(0, 100),
          priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          type: ['preparation', 'followup', 'research', 'decision', 'action'].includes(item.type) ? item.type : 'action'
        }))

      return NextResponse.json({ items: validItems })
    } catch (error) {
      console.error('Failed to generate checklist items:', error)
      return NextResponse.json({ 
        error: 'Failed to generate checklist items',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating checklist items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}