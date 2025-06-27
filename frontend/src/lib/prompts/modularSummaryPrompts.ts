import type { MeetingContext } from './summaryPrompts';

// Modular prompt generation - each function focuses on a specific aspect

export function generateExecutiveSummaryPrompt(transcript: string, context: MeetingContext): string {
  return `Analyze this ${context.type} conversation and provide a concise executive summary.

Duration: ${Math.round(context.duration / 60)} minutes
${context.agenda ? `Agenda: ${context.agenda}` : ''}

TRANSCRIPT:
${transcript}

Generate a JSON response with ONLY the following structure:
{
  "executiveSummary": {
    "oneLineSummary": "Single powerful sentence capturing the meeting's primary outcome",
    "keyOutcome": "The most important result or decision from the meeting",
    "criticalInsight": "The most valuable realization or discovery",
    "immediateAction": "The ONE thing that must happen within 24 hours",
    "meetingSuccess": true/false,
    "successReason": "Why the meeting succeeded or failed"
  },
  "keyPoints": [
    "Main point 1",
    "Main point 2",
    "Main point 3"
  ],
  "metadata": {
    "totalDecisions": 0,
    "totalActionItems": 0,
    "sentiment": "positive/neutral/negative",
    "followUpRequired": true/false
  }
}

Keep the response concise and under 1000 characters.`;
}

export function generateParticipantAnalysisPrompt(transcript: string, context: MeetingContext): string {
  return `Analyze participant contributions in this ${context.type} conversation.

TRANSCRIPT:
${transcript}

Generate a JSON response with participant analysis:
{
  "participants": [
    {
      "name": "Exact name as mentioned",
      "role": "Their role/title if mentioned",
      "speakingPercentage": 50,
      "keyContributions": [
        "Specific contribution 1 (max 3)"
      ],
      "commitments": [
        {
          "commitment": "What they committed to do",
          "deadline": "When they said they'd do it"
        }
      ],
      "concerns": ["Main concern raised"],
      "engagementLevel": "high/medium/low"
    }
  ],
  "conversationDynamics": {
    "rapport": "excellent/good/neutral/poor",
    "balance": "balanced/dominated",
    "energy": "high/medium/low"
  }
}

Focus on the most important contributions only.`;
}

export function generateDecisionsAndActionsPrompt(transcript: string, context: MeetingContext): string {
  return `Extract key decisions and action items from this ${context.type} conversation.

TRANSCRIPT:
${transcript}

Generate a JSON response with decisions and actions:
{
  "keyDecisions": [
    {
      "decision": "Specific decision made",
      "decisionMaker": "Who made the final call",
      "rationale": "Brief reason why",
      "impact": "high/medium/low"
    }
  ],
  "actionItems": [
    {
      "task": "Specific task description",
      "owner": "Person responsible",
      "deadline": "Specific date/time",
      "priority": "critical/high/medium/low",
      "dependencies": ["What needs to happen first"],
      "businessImpact": "Why this matters"
    }
  ],
  "followUpQuestions": [
    "Important unresolved question 1",
    "Important unresolved question 2"
  ]
}

Include only concrete decisions and actionable items.`;
}

export function generateInsightsAndMetricsPrompt(transcript: string, context: MeetingContext): string {
  return `Analyze insights and important metrics from this ${context.type} conversation.

TRANSCRIPT:
${transcript}

Generate a JSON response with insights and metrics:
{
  "insights": [
    {
      "observation": "What was noticed",
      "evidence": "Specific quote or example",
      "implication": "What this means",
      "recommendation": "What should be done"
    }
  ],
  "importantNumbers": [
    {
      "metric": "What the number represents",
      "value": "The actual number/amount",
      "speaker": "Who mentioned it",
      "context": "Why this matters"
    }
  ],
  "quotableQuotes": [
    {
      "quote": "Exact memorable quote",
      "speaker": "Who said it",
      "impact": "Why it matters"
    }
  ]
}

Focus on the most impactful insights and metrics only.`;
}

export function generateEffectivenessScorePrompt(transcript: string, context: MeetingContext, keyDecisions: number, actionItems: number): string {
  return `Evaluate the effectiveness of this ${context.type} meeting.

Meeting Duration: ${Math.round(context.duration / 60)} minutes
Decisions Made: ${keyDecisions}
Action Items: ${actionItems}
${context.agenda ? `Agenda: ${context.agenda}` : ''}

TRANSCRIPT EXCERPT (first 2000 chars):
${transcript.substring(0, 2000)}...

Generate a JSON response with effectiveness analysis:
{
  "effectivenessScore": {
    "overall": 85,
    "breakdown": {
      "objectives": 90,
      "participation": 85,
      "decisions": 80,
      "clarity": 85,
      "efficiency": 75
    },
    "strengths": [
      "Top strength observed"
    ],
    "improvements": [
      {
        "area": "Area to improve",
        "suggestion": "Specific suggestion"
      }
    ]
  },
  "meetingFlow": {
    "opening": "strong/adequate/weak",
    "mainDiscussion": "focused/scattered",
    "closing": "clear/rushed/unclear",
    "timeManagement": "excellent/good/poor"
  }
}`;
}

export function generateRiskAssessmentPrompt(transcript: string, context: MeetingContext): string {
  if (context.type !== 'sales' && context.type !== 'meeting') {
    return '';
  }

  return `Identify risks and opportunities from this ${context.type} conversation.

TRANSCRIPT EXCERPT (last 3000 chars):
...${transcript.substring(Math.max(0, transcript.length - 3000))}

Generate a JSON response with risk assessment:
{
  "riskAssessment": {
    "immediate": [
      {
        "risk": "Specific risk description",
        "impact": "high/medium/low",
        "probability": "high/medium/low",
        "mitigation": "How to address it",
        "owner": "Who should handle this"
      }
    ],
    "opportunities": [
      {
        "opportunity": "Potential upside",
        "probability": "high/medium/low",
        "action": "How to capitalize"
      }
    ]
  }
}

Focus on the top 2-3 risks and opportunities.`;
}

export function generateFollowUpContentPrompt(
  transcript: string, 
  context: MeetingContext,
  keyDecisions: any[],
  actionItems: any[]
): string {
  return `Generate follow-up content for this ${context.type} meeting.

Key Decisions: ${keyDecisions.length}
Action Items: ${actionItems.length}

SUMMARY OF DISCUSSION:
- Duration: ${Math.round(context.duration / 60)} minutes
- Type: ${context.type}
${keyDecisions.slice(0, 2).map(d => `- Decision: ${d.decision}`).join('\n')}
${actionItems.slice(0, 2).map(a => `- Action: ${a.task} (${a.owner})`).join('\n')}

Generate a JSON response with follow-up content:
{
  "emailDraft": {
    "subject": "Concise action-oriented subject",
    "body": "2-3 paragraph summary with next steps (max 200 words)",
    "bulletPoints": [
      "Key point 1",
      "Key point 2"
    ],
    "callToAction": "One clear next step"
  },
  "nextMeetingRecommendation": {
    "needed": true/false,
    "suggestedTiming": "when to meet next",
    "suggestedAgenda": [
      "Topic 1",
      "Topic 2"
    ]
  }
}`;
}

export function combineModularResults(results: {
  executive?: any;
  participants?: any;
  decisions?: any;
  insights?: any;
  effectiveness?: any;
  risks?: any;
  followUp?: any;
}): any {
  // Combine all the modular results into the full summary structure
  return {
    tldr: results.executive?.executiveSummary?.oneLineSummary || 'Summary not available',
    key_points: results.executive?.keyPoints || [],
    action_items: results.decisions?.actionItems || [],
    outcomes: results.decisions?.keyDecisions || [],
    next_steps: results.decisions?.actionItems?.map((a: any) => a.task) || [],
    insights: results.insights?.insights || [],
    missed_opportunities: [],
    successful_moments: results.insights?.quotableQuotes?.filter((q: any) => q.impact?.includes('positive')) || [],
    conversation_dynamics: results.participants?.conversationDynamics || {},
    effectiveness_metrics: results.effectiveness?.effectivenessScore?.breakdown || {},
    agenda_coverage: {
      completionRate: results.executive?.metadata?.completionRate || '100%',
      items_covered: [],
      items_missed: [],
      unexpected_topics: []
    },
    coaching_recommendations: results.effectiveness?.effectivenessScore?.improvements?.map((i: any) => 
      typeof i === 'string' ? i : i.suggestion
    ) || [],
    email_draft: results.followUp?.emailDraft,
    risk_assessment: results.risks?.riskAssessment,
    effectiveness_score: results.effectiveness?.effectivenessScore,
    next_meeting_template: results.followUp?.nextMeetingRecommendation?.needed ? {
      suggestedAgenda: results.followUp.nextMeetingRecommendation.suggestedAgenda || [],
      requiredAttendees: [],
      prework: [],
      successCriteria: ''
    } : undefined,
    participants: results.participants?.participants || [],
    important_numbers: results.insights?.importantNumbers || [],
    quotable_quotes: results.insights?.quotableQuotes || [],
    metadata: results.executive?.metadata || {},
    keyOutcome: results.executive?.executiveSummary?.keyOutcome,
    criticalInsight: results.executive?.executiveSummary?.criticalInsight,
    immediateAction: results.executive?.executiveSummary?.immediateAction,
    follow_up_questions: results.decisions?.followUpQuestions || []
  };
}