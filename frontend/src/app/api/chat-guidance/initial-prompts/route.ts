import { NextRequest, NextResponse } from 'next/server';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';
import { z } from 'zod';

// Fallback prompts for different meeting types
const getFallbackPrompts = (meetingType: string, hasTranscript: boolean) => {
  const basePrompts: Record<string, Array<{text: string, prompt: string, impact: number}>> = {
    sales: [
      { text: "🎯 Meeting prep", prompt: "How should I prepare for this sales call?", impact: 95 },
      { text: "📋 Qualifying questions", prompt: "What qualifying questions should I ask to understand their needs?", impact: 90 },
      { text: "💡 Value proposition", prompt: "Help me craft a compelling value proposition for this prospect", impact: 85 },
      { text: "🤝 Build rapport", prompt: "What's the best way to build rapport at the start?", impact: 80 }
    ],
    interview: [
      { text: "🎯 First impression", prompt: "How do I make a strong first impression in this interview?", impact: 95 },
      { text: "❓ Smart questions", prompt: "What thoughtful questions should I ask about the role and company?", impact: 90 },
      { text: "💼 Experience stories", prompt: "Help me prepare relevant experience stories using STAR method", impact: 85 },
      { text: "📝 Company research", prompt: "What should I know about this company before the interview?", impact: 80 }
    ],
    team_meeting: [
      { text: "📋 Meeting structure", prompt: "How should I structure this team meeting for maximum productivity?", impact: 90 },
      { text: "🎯 Clear objectives", prompt: "Help me define clear objectives for this meeting", impact: 85 },
      { text: "👥 Facilitate discussion", prompt: "What's the best way to facilitate productive discussion?", impact: 80 },
      { text: "⏰ Time management", prompt: "How can I manage time effectively during this meeting?", impact: 75 }
    ],
    support: [
      { text: "🤝 Empathy first", prompt: "How can I show empathy while addressing their issue?", impact: 90 },
      { text: "🔍 Diagnose problem", prompt: "What questions should I ask to diagnose their problem?", impact: 85 },
      { text: "💡 Solution approach", prompt: "Help me structure my approach to solving their issue", impact: 80 },
      { text: "📝 Document issue", prompt: "What details should I capture about this support case?", impact: 75 }
    ],
    coaching: [
      { text: "🎯 Session goals", prompt: "How should I establish clear goals for this coaching session?", impact: 90 },
      { text: "❓ Powerful questions", prompt: "What powerful questions can I ask to facilitate insight?", impact: 85 },
      { text: "👂 Active listening", prompt: "How can I practice active listening effectively?", impact: 80 },
      { text: "📊 Track progress", prompt: "What's the best way to track and measure progress?", impact: 75 }
    ],
    custom: [
      { text: "🎯 Meeting prep", prompt: "How should I prepare for this conversation?", impact: 85 },
      { text: "📋 Set agenda", prompt: "Help me create an effective agenda", impact: 80 },
      { text: "💡 Key points", prompt: "What key points should I cover?", impact: 75 },
      { text: "🤝 Build connection", prompt: "How can I build a strong connection?", impact: 70 }
    ]
  };

  // If recording has started, adjust prompts to be more tactical
  if (hasTranscript) {
    const livePrompts: Record<string, Array<{text: string, prompt: string, impact: number}>> = {
      sales: [
        { text: "🎯 Next question", prompt: "What should I ask next to move this sale forward?", impact: 95 },
        { text: "💰 Discuss pricing", prompt: "How should I transition to discussing pricing?", impact: 90 },
        { text: "🛡️ Handle objection", prompt: "How can I address their concerns effectively?", impact: 85 },
        { text: "📅 Next steps", prompt: "What next steps should I propose?", impact: 80 }
      ],
      interview: [
        { text: "💡 Current topic", prompt: "How should I expand on what we're discussing?", impact: 90 },
        { text: "❓ Follow-up", prompt: "What follow-up question should I ask?", impact: 85 },
        { text: "🎯 Showcase skills", prompt: "How can I highlight relevant skills now?", impact: 80 },
        { text: "📝 Take notes", prompt: "What key points should I remember?", impact: 75 }
      ],
      team_meeting: [
        { text: "🎯 Stay on track", prompt: "How do I bring us back to the main topic?", impact: 90 },
        { text: "👥 Include everyone", prompt: "How can I get input from quieter team members?", impact: 85 },
        { text: "⚖️ Make decision", prompt: "How should we approach making this decision?", impact: 80 },
        { text: "📋 Action items", prompt: "What action items should we establish?", impact: 75 }
      ]
    };
    return livePrompts[meetingType] || basePrompts.custom;
  }

  return basePrompts[meetingType] || basePrompts.custom;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const BodySchema = z.object({
      meetingType: z.string().optional().default('custom'),
      meetingTitle: z.string().optional(),
      context: z.string().optional(),
      participantMe: z.string().optional(),
      participantThem: z.string().optional(),
      hasTranscript: z.boolean().optional().default(false),
      linkedConversations: z.array(z.object({
        id: z.string(),
        title: z.string()
      })).optional()
    });

    const {
      meetingType,
      meetingTitle,
      context,
      participantMe,
      participantThem,
      hasTranscript,
      linkedConversations
    } = BodySchema.parse(body);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('OpenRouter API key not configured, using fallback prompts');
      const fallbackPrompts = getFallbackPrompts(meetingType, hasTranscript);
      return NextResponse.json({ suggestedActions: fallbackPrompts.slice(0, 4) });
    }

    // Build context for AI
    const meLabel = participantMe || 'You';
    const themLabel = participantThem || 'The other participant';
    
    let contextInfo = '';
    if (meetingTitle) contextInfo += `Meeting: "${meetingTitle}"\n`;
    if (context) contextInfo += `Context/Agenda: ${context}\n`;
    if (linkedConversations && linkedConversations.length > 0) {
      contextInfo += `Previous conversations: ${linkedConversations.map(c => c.title).join(', ')}\n`;
    }

    const systemPrompt = `You are an AI meeting advisor generating initial conversation prompts for ${meLabel} to get started.

${getCurrentDateContext()}

MEETING DETAILS:
- Type: ${meetingType}
- Participants: ${meLabel} and ${themLabel}
${contextInfo}
- Status: ${hasTranscript ? 'Meeting in progress' : 'Before meeting starts'}

Generate EXACTLY 4 contextual prompts that ${meLabel} can use to get helpful guidance from their AI advisor. Each prompt should be:
1. RELEVANT: Specific to the meeting type and context
2. ACTIONABLE: Helps ${meLabel} prepare or navigate the conversation
3. VALUABLE: Addresses common challenges or opportunities

Focus on what ${meLabel} would most likely need help with when ${hasTranscript ? 'during' : 'preparing for'} a ${meetingType} conversation with ${themLabel}.

CRITICAL: Return ONLY a valid JSON object with a suggestedActions array. No other text.
The response must be valid JSON starting with { and ending with }

Return exactly this format:
{
  "suggestedActions": [
    {"text": "<emoji> 3-4 word label", "prompt": "Full question for the AI advisor", "impact": 90},
    {"text": "<emoji> 3-4 word label", "prompt": "Full question for the AI advisor", "impact": 85},
    {"text": "<emoji> 3-4 word label", "prompt": "Full question for the AI advisor", "impact": 80},
    {"text": "<emoji> 3-4 word label", "prompt": "Full question for the AI advisor", "impact": 75}
  ]
}

Make prompts specific to the meeting context. For example:
- If it's a sales call, focus on qualification, value prop, objection handling
- If it's an interview, focus on preparation, questions to ask, showcasing experience
- If it's a team meeting, focus on facilitation, time management, decision making

${hasTranscript ? 'Since the meeting is in progress, make prompts tactical and immediate.' : 'Since the meeting hasn\'t started, make prompts about preparation and strategy.'}`;

    // Get the AI model for initial prompts
    const defaultModel = await getAIModelForAction(AIAction.INITIAL_PROMPTS);

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveprompt.ai Initial Prompts'
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      // Return fallback prompts on API error
      const fallbackPrompts = getFallbackPrompts(meetingType, hasTranscript);
      return NextResponse.json({ suggestedActions: fallbackPrompts.slice(0, 4) });
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content?.trim();

    try {
      const parsedResponse = JSON.parse(rawContent);
      
      // Validate response structure
      if (!parsedResponse.suggestedActions || !Array.isArray(parsedResponse.suggestedActions)) {
        throw new Error('Invalid response structure');
      }

      // Ensure we have exactly 4 prompts
      const prompts = parsedResponse.suggestedActions.slice(0, 4);
      
      // Add default impact scores if missing
      const validatedPrompts = prompts.map((p: any, index: number) => ({
        text: p.text || '🎯 Get guidance',
        prompt: p.prompt || 'How can you help me with this meeting?',
        impact: p.impact || (95 - index * 5)
      }));

      console.log('Generated initial prompts:', validatedPrompts.map((p: any) => p.text));
      return NextResponse.json({ suggestedActions: validatedPrompts });

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', rawContent);
      
      // Return fallback prompts
      const fallbackPrompts = getFallbackPrompts(meetingType, hasTranscript);
      return NextResponse.json({ suggestedActions: fallbackPrompts.slice(0, 4) });
    }

  } catch (error) {
    console.error('Initial prompts API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate initial prompts',
        suggestedActions: getFallbackPrompts('custom', false).slice(0, 4)
      },
      { status: 500 }
    );
  }
}