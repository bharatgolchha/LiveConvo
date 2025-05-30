import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

interface FinalSummaryRequest {
  conversationType?: string;
  conversationTitle?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { transcript, textContext, conversationType, conversationTitle } = await request.json();

    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // Convert transcript array to text if needed
    const transcriptText = Array.isArray(transcript) 
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : transcript;

    // Generate summary and finalization
    const summary = await generateFinalSummary(transcriptText, conversationType);
    const finalData = await generateFinalizationData(transcriptText, textContext, conversationType, summary);

    // Here you would typically save to database
    // For now, we'll return the generated data

    return NextResponse.json({
      sessionId,
      summary,
      finalization: finalData,
      transcript: transcriptText,
      conversationType,
      conversationTitle,
      finalizedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session finalization error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize session' },
      { status: 500 }
    );
  }
}

async function generateFinalSummary(transcript: string, conversationType?: string) {
  const systemPrompt = `You are an expert conversation analyst. Create a comprehensive final summary of this completed conversation.

Return a JSON object with this structure:
{
  "tldr": "Brief 2-3 sentence summary of the entire conversation",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "sentiment": "positive|negative|neutral",
  "action_items": ["Action 1", "Action 2"],
  "participants": ["Name 1", "Name 2"],
  "duration_estimate": "estimated conversation length",
  "conversation_type": "meeting|sales|support|interview|other",
  "outcomes": ["Outcome 1", "Outcome 2"],
  "next_steps": ["Next step 1", "Next step 2"],
  "success_metrics": {
    "goals_achieved": 85,
    "participant_satisfaction": 90,
    "effectiveness_score": 88
  }
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'LiveConvo Session Summary',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-preview-05-20',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please analyze this completed conversation and provide a final summary:\n\n${transcript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateFinalizationData(transcript: string, context: string, conversationType?: string, summary?: any) {
  const systemPrompt = `You are an expert conversation coach providing final insights and recommendations based on a completed conversation.

Return a JSON object with this structure:
{
  "performance_analysis": {
    "strengths": ["Strength 1", "Strength 2"],
    "areas_for_improvement": ["Area 1", "Area 2"],
    "communication_effectiveness": 85,
    "goal_achievement": 90
  },
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "follow_up_suggestions": ["Follow-up 1", "Follow-up 2"],
  "lessons_learned": ["Lesson 1", "Lesson 2"]
}`;

  // ... existing code ...
}

function getConversationTypeGuidelines(conversationType?: string): string {
  const guidelines = {
    sales: `
- Customer needs, pain points, and requirements identified
- Budget, decision-making process, and timeline discussions
- Product features, benefits, and objections covered
- Competitive considerations and differentiators
- Pricing discussions and proposal requirements
- Next steps in the sales process and follow-up timeline`,

    support: `
- Customer issue description and impact assessment
- Troubleshooting steps performed and results
- Root cause analysis and resolution approach
- Escalation decisions and technical requirements
- Customer satisfaction and feedback
- Follow-up support needs and timeline`,

    meeting: `
- Agenda items covered and outcomes achieved
- Strategic decisions and policy changes
- Project updates, milestones, and roadmap changes
- Resource allocation and staffing decisions
- Risk assessment and mitigation strategies
- Next meeting requirements and timeline`,

    interview: `
- Candidate background, experience, and qualifications
- Technical skills assessment and competency evaluation
- Cultural fit assessment and team dynamics
- Compensation expectations and career goals
- Interview feedback and evaluation criteria
- Next steps in the hiring process and timeline`
  };

  return guidelines[conversationType as keyof typeof guidelines] || 
         'Focus on key discussions, decisions, action items, and outcomes.';
} 