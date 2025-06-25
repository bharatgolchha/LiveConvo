export interface MeetingContext {
  type: 'sales' | 'interview' | 'meeting' | 'support' | 'general';
  agenda?: string;
  context?: string;
  previousMeetings?: string[];
  participantCount: number;
  duration: number;
}

export interface SummaryPromptConfig {
  includeEmailDraft: boolean;
  includeRiskAssessment: boolean;
  includeEffectivenessScore: boolean;
  includeNextMeetingTemplate: boolean;
}

const BASE_SUMMARY_INSTRUCTIONS = `Generate a comprehensive meeting summary focused on specific, actionable insights.
- Use exact names, numbers, and dates from the conversation
- Make every point actionable with clear ownership
- Be concise but thorough`;

const MEETING_TYPE_CONTEXTS = {
  sales: {
    focus: 'Deal progression, customer needs, objections, and next steps',
    metrics: ['Deal size', 'Timeline', 'Decision criteria', 'Competition', 'Budget'],
    risks: ['Budget concerns', 'Competitor mentions', 'Timeline delays', 'Stakeholder alignment'],
  },
  interview: {
    focus: 'Candidate assessment, cultural fit, technical skills, and hiring decision',
    metrics: ['Technical proficiency', 'Communication skills', 'Cultural fit', 'Experience relevance'],
    risks: ['Skill gaps', 'Compensation misalignment', 'Availability issues', 'Other offers'],
  },
  meeting: {
    focus: 'Decisions made, action items assigned, blockers identified, and progress updates',
    metrics: ['Decisions count', 'Action items', 'Agenda completion', 'Participation balance'],
    risks: ['Unresolved blockers', 'Resource constraints', 'Timeline risks', 'Dependency issues'],
  },
  support: {
    focus: 'Customer issues, resolution steps, satisfaction indicators, and follow-up needs',
    metrics: ['Issue severity', 'Resolution time', 'Customer sentiment', 'Technical complexity'],
    risks: ['Unresolved issues', 'Customer frustration', 'Escalation needs', 'Product gaps'],
  },
  general: {
    focus: 'Key topics discussed, outcomes achieved, and next steps identified',
    metrics: ['Topic coverage', 'Participation', 'Outcomes', 'Follow-ups'],
    risks: ['Unclear outcomes', 'Missing stakeholders', 'Undefined next steps'],
  },
};

export function generateEnhancedSummaryPrompt(
  transcript: string,
  context: MeetingContext,
  config: SummaryPromptConfig
): string {
  const typeContext = MEETING_TYPE_CONTEXTS[context.type];
  const currentDate = new Date().toISOString().split('T')[0];
  
  let prompt = `${BASE_SUMMARY_INSTRUCTIONS}

Meeting Type: ${context.type.toUpperCase()}
Date: ${currentDate}
Duration: ${Math.round(context.duration / 60)} minutes
Participants: ${context.participantCount} people

${context.agenda ? `Meeting Agenda:\n${context.agenda}\n` : ''}
${context.context ? `Additional Context:\n${context.context}\n` : ''}

Focus Areas for ${context.type.toUpperCase()} Meeting:
- ${typeContext.focus}

Key Metrics to Extract:
${typeContext.metrics.map(m => `- ${m}`).join('\n')}

Risk Factors to Identify:
${typeContext.risks.map(r => `- ${r}`).join('\n')}

TRANSCRIPT:
${transcript}

Generate a comprehensive JSON report with the following structure:

{
  "executiveSummary": {
    "oneLineSummary": "Single sentence capturing the meeting's primary outcome",
    "keyOutcome": "Most important result or decision from the meeting",
    "criticalInsight": "Most valuable insight that emerged",
    "immediateAction": "The ONE thing that must happen next"
  },
  
  "participants": [
    {
      "name": "Participant name",
      "role": "Their role/title if mentioned",
      "keyContributions": ["Specific contribution 1", "Specific contribution 2"],
      "commitments": ["What they committed to do"],
      "concerns": ["Any concerns they raised"]
    }
  ],
  
  "discussion": {
    "mainTopics": [
      {
        "topic": "Topic name",
        "summary": "What was discussed",
        "outcome": "What was decided/concluded",
        "timeSpent": "Approximate minutes on this topic"
      }
    ],
    "keyDecisions": [
      {
        "decision": "Specific decision made",
        "rationale": "Why this decision",
        "owner": "Who will execute",
        "deadline": "When it needs to be done"
      }
    ],
    "importantNumbers": [
      {
        "metric": "What the number represents",
        "value": "The actual number/amount",
        "context": "Why this matters"
      }
    ]
  },
  
  "actionItems": [
    {
      "task": "Specific task description",
      "owner": "Person responsible",
      "deadline": "Due date (be specific)",
      "priority": "high/medium/low",
      "dependencies": ["What needs to happen first"],
      "successCriteria": "How we'll know it's done"
    }
  ],
  
  "analysis": {
    "meetingEffectiveness": {
      "agendaCompletion": "X out of Y agenda items covered",
      "participationBalance": "Was discussion balanced or dominated?",
      "timeManagement": "Did meeting stay on schedule?",
      "outcomeClarity": "Were outcomes clearly defined?"
    },
    "momentum": {
      "positive": ["What's moving forward well"],
      "concerns": ["What might slow progress"],
      "blockers": ["What's completely blocked"]
    },
    "relationships": {
      "strongAlignment": ["Where participants agreed strongly"],
      "tensions": ["Any disagreements or tensions"],
      "buildingNeeded": ["Relationships that need attention"]
    }
  },`;

  if (config.includeRiskAssessment) {
    prompt += `
  
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
    "monitoring": [
      {
        "indicator": "What to watch for",
        "threshold": "When to take action",
        "checkDate": "When to check"
      }
    ]
  },`;
  }

  if (config.includeEffectivenessScore) {
    prompt += `
  
  "effectivenessScore": {
    "overall": 85, // 0-100 score
    "breakdown": {
      "objectives": 90, // How well objectives were met
      "participation": 80, // Quality of participation
      "decisions": 85, // Quality of decisions made
      "clarity": 90 // Clarity of outcomes
    },
    "improvements": ["Specific suggestions for next meeting"]
  },`;
  }

  if (config.includeEmailDraft) {
    prompt += `
  
  "followUpEmail": {
    "subject": "Concise action-oriented subject",
    "body": "2-3 paragraph summary with next steps",
    "bulletPoints": ["3-4 key points max"],
    "callToAction": "One clear next step"
  },`;
  }

  if (config.includeNextMeetingTemplate) {
    prompt += `
  
  "nextMeeting": {
    "suggestedAgenda": [
      "Follow-up on: [specific items]",
      "Review: [what needs reviewing]",
      "Discuss: [new topics based on this meeting]"
    ],
    "requiredAttendees": ["List of essential people"],
    "prework": ["What should be done before next meeting"],
    "successCriteria": "What would make the next meeting successful"
  },`;
  }

  prompt += `
  
  "coaching": {
    "strengths": ["What went particularly well"],
    "improvements": ["Specific areas for improvement with examples"],
    "techniques": ["Specific techniques to try next time"]
  }
}

Remember:
- Use ACTUAL quotes when relevant
- Include SPECIFIC names, numbers, and dates
- Make action items CRYSTAL CLEAR with owners and deadlines
- Focus on VALUE - what matters most for follow-through
- Keep language NATURAL and professional`;

  return prompt;
}

export function generateCoachingPrompt(
  transcript: string,
  summaryData: any,
  context: MeetingContext
): string {
  const typeContext = MEETING_TYPE_CONTEXTS[context.type];
  
  return `Provide performance coaching for this ${context.type} meeting (${Math.round(context.duration / 60)}min).

Key areas: ${typeContext.focus}

Generate coaching feedback:

{
  "performanceAnalysis": {
    "overall": "Brief overall assessment",
    "score": 85, // 0-100
    "strengths": [
      {
        "area": "Specific strength",
        "example": "Quote or moment demonstrating this",
        "impact": "Why this mattered"
      }
    ],
    "improvements": [
      {
        "area": "Specific improvement area",
        "current": "What happened",
        "better": "What could have been done",
        "technique": "Specific technique to apply"
      }
    ]
  },
  
  "communicationPatterns": {
    "listeningRatio": "X% speaking vs Y% listening",
    "questionQuality": {
      "open": "Number of open-ended questions",
      "closed": "Number of closed questions",
      "missed": ["Opportunities for better questions"]
    },
    "clarity": {
      "clear": ["Examples of clear communication"],
      "unclear": ["Moments that needed clarification"]
    }
  },
  
  "relationshipDynamics": {
    "rapport": "Assessment of rapport building",
    "trust": "Trust indicators observed",
    "tension": "Any tension points and how they were handled",
    "suggestions": ["Specific relationship building tips"]
  },
  
  "strategicInsights": {
    "opportunities": [
      {
        "what": "Opportunity identified",
        "how": "How to capitalize on it",
        "when": "Timing recommendation"
      }
    ],
    "risks": [
      {
        "what": "Risk identified",
        "mitigation": "How to address it",
        "priority": "high/medium/low"
      }
    ]
  },
  
  "nextTimeRecommendations": {
    "preparation": ["Specific prep steps for similar meetings"],
    "techniques": [
      {
        "technique": "Specific technique name",
        "when": "When to use it",
        "how": "How to implement it",
        "example": "Example of how it would sound"
      }
    ],
    "focus": ["Top 3 things to focus on improving"]
  },
  
  "templates": {
    "openingStatement": "Suggested way to open similar meetings",
    "transitionPhrases": ["Smooth ways to transition topics"],
    "closingStatement": "Strong way to close and confirm next steps"
  }
}

Focus on:
- SPECIFIC moments from the transcript
- ACTIONABLE advice they can implement immediately
- REALISTIC improvements based on their current level
- ${typeContext.focus}`;
}

export function generateEmailDraftPrompt(summaryData: any, context: MeetingContext): string {
  return `Create a professional follow-up email based on this meeting summary.

Meeting Type: ${context.type}
Summary: ${JSON.stringify(summaryData, null, 2)}

Generate:
{
  "subject": "Clear, action-oriented subject line",
  "body": {
    "opening": "Brief, warm opening paragraph",
    "summary": "2-3 sentences capturing key outcomes",
    "bulletPoints": [
      "• Key decision or outcome 1",
      "• Key decision or outcome 2",
      "• Key decision or outcome 3"
    ],
    "actionItems": [
      "• [Owner]: [Task] by [Date]",
      "• [Owner]: [Task] by [Date]"
    ],
    "closing": "Professional closing with clear next step"
  },
  "tone": "professional yet conversational"
}`;
}