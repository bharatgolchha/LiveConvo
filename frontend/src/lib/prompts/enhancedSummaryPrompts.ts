import type { MeetingContext, SummaryPromptConfig } from './summaryPrompts';

export function generateEnhancedSummaryPromptV2(
  transcript: string,
  context: MeetingContext,
  config: SummaryPromptConfig
): string {
  const currentDate = new Date().toISOString().split('T')[0];
  const meetingType = context.type.toUpperCase();
  
  let prompt = `You are an expert meeting analyst. Analyze this ${meetingType} conversation and generate a comprehensive, actionable report.

MEETING DETAILS:
- Type: ${meetingType}
- Date: ${currentDate}
- Duration: ${Math.round(context.duration / 60)} minutes
- Participants: ${context.participantCount} people
${context.agenda ? `- Agenda: ${context.agenda}` : ''}
${context.context ? `- Context: ${context.context}` : ''}

ANALYSIS REQUIREMENTS:
1. Extract EXACT quotes, names, numbers, dates, and commitments
2. Identify WHO said WHAT and WHEN
3. Track each participant's contributions separately
4. Note specific examples and evidence for all insights
5. Create actionable next steps with clear ownership

TRANSCRIPT:
${transcript}

Generate a comprehensive JSON report with the following enhanced structure:

{
  "executiveSummary": {
    "oneLineSummary": "Single powerful sentence capturing the meeting's primary outcome",
    "keyOutcome": "The most important result or decision from the meeting",
    "criticalInsight": "The most valuable realization or discovery",
    "immediateAction": "The ONE thing that must happen within 24 hours",
    "meetingSuccess": true/false,
    "successReason": "Why the meeting succeeded or failed"
  },
  
  "participants": [
    {
      "name": "Exact name as mentioned",
      "role": "Their role/title if mentioned",
      "speakingPercentage": 50,
      "keyContributions": [
        "Specific contribution with quote if applicable"
      ],
      "commitments": [
        {
          "commitment": "What they committed to do",
          "deadline": "When they said they'd do it",
          "quote": "Their exact words"
        }
      ],
      "concerns": [
        {
          "concern": "What worried them",
          "quote": "Their exact words"
        }
      ],
      "expertise": ["Areas where they showed knowledge"],
      "engagementLevel": "high/medium/low",
      "influenceScore": 85 // 0-100 based on their impact on decisions
    }
  ],
  
  "conversationFlow": {
    "timeline": [
      {
        "timestamp": "0-5 min",
        "phase": "Opening/Rapport Building",
        "keyMoments": ["Specific things that happened"],
        "energy": "high/medium/low"
      }
    ],
    "topicProgression": [
      {
        "topic": "Topic name",
        "initiatedBy": "Person name",
        "duration": "X minutes",
        "depth": "surface/moderate/deep",
        "resolution": "fully resolved/partially resolved/unresolved"
      }
    ],
    "turningPoints": [
      {
        "moment": "What happened",
        "speaker": "Who caused it",
        "impact": "How it changed the conversation",
        "quote": "Exact words if significant"
      }
    ]
  },
  
  "discussion": {
    "mainTopics": [
      {
        "topic": "Specific topic name",
        "summary": "Detailed summary of what was discussed",
        "outcome": "What was decided or concluded",
        "participants": ["Names of who contributed"],
        "keyQuotes": [
          {
            "speaker": "Name",
            "quote": "Exact important quote"
          }
        ],
        "unresolved": ["Any open questions about this topic"]
      }
    ],
    "keyDecisions": [
      {
        "decision": "Specific decision made",
        "decisionMaker": "Who made the final call",
        "rationale": "Why this decision (with evidence)",
        "supportLevel": "unanimous/majority/contested",
        "dissenters": ["Names of those who disagreed"],
        "implementation": {
          "owner": "Who will execute",
          "deadline": "When it needs to be done",
          "resources": "What's needed",
          "successCriteria": "How we'll know it worked"
        }
      }
    ],
    "importantNumbers": [
      {
        "metric": "What the number represents",
        "value": "The actual number/amount",
        "speaker": "Who mentioned it",
        "context": "Why this matters",
        "comparison": "How it compares to expectations/previous"
      }
    ],
    "mentionedCompetitors": [
      {
        "name": "Competitor name",
        "context": "How they were mentioned",
        "threat": "high/medium/low",
        "ourAdvantage": "How we compare"
      }
    ]
  },
  
  "actionItems": [
    {
      "task": "Specific task description",
      "owner": "Person responsible",
      "deadline": "Specific date/time",
      "priority": "critical/high/medium/low",
      "dependencies": ["What needs to happen first"],
      "stakeholders": ["Who needs to be involved/informed"],
      "successCriteria": "How we'll know it's done",
      "estimatedEffort": "Hours/days needed",
      "businessImpact": "What happens if we do/don't do this"
    }
  ],
  
  "insights": [
    {
      "observation": "What was noticed",
      "evidence": ["Specific examples from conversation"],
      "implications": "What this means for the business",
      "recommendation": "What should be done about it",
      "owner": "Who should act on this",
      "priority": "high/medium/low"
    }
  ],
  
  "analysis": {
    "meetingEffectiveness": {
      "score": 85, // 0-100
      "agendaCompletion": "X out of Y agenda items fully addressed",
      "participationBalance": {
        "score": "balanced/dominated/uneven",
        "details": "Specific observations about participation"
      },
      "timeManagement": {
        "onSchedule": true/false,
        "overtime": "X minutes",
        "rushToFinish": true/false
      },
      "outcomeClarity": {
        "score": 90, // 0-100
        "clearItems": ["What was crystal clear"],
        "unclearItems": ["What remains ambiguous"]
      }
    },
    "momentum": {
      "overall": "accelerating/steady/stalling",
      "positive": [
        {
          "indicator": "What's moving forward",
          "evidence": "How we know",
          "nextStep": "What to do to maintain"
        }
      ],
      "concerns": [
        {
          "issue": "What might slow progress",
          "severity": "high/medium/low",
          "mitigation": "How to address"
        }
      ],
      "blockers": [
        {
          "blocker": "What's completely stuck",
          "owner": "Who can unblock",
          "deadline": "When it must be resolved"
        }
      ]
    },
    "relationships": {
      "overall": "strengthening/stable/strained",
      "dynamics": [
        {
          "between": ["Person A", "Person B"],
          "quality": "collaborative/neutral/tense",
          "evidence": "Specific interactions"
        }
      ],
      "trust": {
        "level": "high/building/low",
        "indicators": ["What showed trust or lack thereof"]
      },
      "conflicts": [
        {
          "parties": ["Who disagreed"],
          "issue": "What about",
          "resolution": "resolved/ongoing/escalated"
        }
      ]
    }
  },`;

  // Add conditional sections based on config
  if (config.includeRiskAssessment) {
    prompt += `
  
  "riskAssessment": {
    "overall": "high/medium/low",
    "immediate": [
      {
        "risk": "Specific risk description",
        "category": "financial/operational/strategic/relationship",
        "impact": "critical/high/medium/low",
        "probability": "certain/likely/possible/unlikely",
        "indicator": "How we'll know it's happening",
        "mitigation": "Specific action to prevent/reduce",
        "owner": "Who should handle this",
        "deadline": "When to act by"
      }
    ],
    "monitoring": [
      {
        "indicator": "What to watch for",
        "threshold": "When to take action",
        "frequency": "How often to check",
        "owner": "Who monitors",
        "escalation": "Who to alert if threshold hit"
      }
    ],
    "opportunities": [
      {
        "opportunity": "Potential upside identified",
        "probability": "high/medium/low",
        "value": "Potential impact",
        "action": "How to capitalize",
        "owner": "Who should pursue"
      }
    ]
  },`;
  }

  if (config.includeEffectivenessScore) {
    prompt += `
  
  "effectivenessScore": {
    "overall": 85, // 0-100 weighted average
    "breakdown": {
      "objectives": 90, // How well objectives were met
      "participation": 85, // Quality of participation
      "decisions": 80, // Quality and clarity of decisions
      "clarity": 85, // Clarity of communication
      "efficiency": 75, // Time used effectively
      "engagement": 90 // Level of engagement
    },
    "strengths": [
      "Specific things done exceptionally well"
    ],
    "improvements": [
      {
        "area": "What to improve",
        "current": "What happened",
        "better": "What would be better",
        "how": "Specific technique to use"
      }
    ],
    "benchmarkComparison": "How this compares to typical ${meetingType} meetings"
  },`;
  }

  if (config.includeEmailDraft) {
    prompt += `
  
  "followUpEmail": {
    "subject": "Action-oriented subject that creates urgency",
    "to": ["Primary recipients"],
    "cc": ["Secondary recipients who need visibility"],
    "body": {
      "opening": "Warm, professional opening paragraph",
      "context": "Brief reminder of meeting purpose",
      "keyOutcomes": "2-3 sentences on main results",
      "decisions": [
        "• Decision 1 with brief rationale",
        "• Decision 2 with impact"
      ],
      "actionItems": [
        "• [OWNER] Action item by [DATE]",
        "• [OWNER] Action item by [DATE]"
      ],
      "nextSteps": "Clear description of what happens next",
      "closing": "Professional closing with specific call to action"
    },
    "attachments": ["Suggested attachments to include"],
    "sendTiming": "When to send for maximum impact"
  },`;
  }

  if (config.includeNextMeetingTemplate) {
    prompt += `
  
  "nextMeeting": {
    "recommended": true/false,
    "urgency": "immediate/thisWeek/nextWeek/thisMonth",
    "purpose": "Clear objective for next meeting",
    "suggestedDuration": "X minutes",
    "suggestedAgenda": [
      {
        "item": "Agenda topic",
        "duration": "X min",
        "owner": "Who leads this",
        "prework": "What must be done before"
      }
    ],
    "requiredAttendees": [
      {
        "name": "Person name",
        "reason": "Why they must attend"
      }
    ],
    "optionalAttendees": ["Names of nice-to-have participants"],
    "prework": [
      {
        "task": "What must be done",
        "owner": "Who does it",
        "deadline": "When it's due"
      }
    ],
    "successCriteria": "What would make the next meeting successful",
    "materials": ["Documents/data to prepare"]
  },`;
  }

  prompt += `
  
  "quotableQuotes": [
    {
      "quote": "Memorable or important exact quote",
      "speaker": "Who said it",
      "context": "When/why it was said",
      "impact": "Why it matters"
    }
  ],
  
  "metadata": {
    "totalSpeakers": ${context.participantCount},
    "totalDecisions": "Number of decisions made",
    "totalActionItems": "Number of action items",
    "completionRate": "% of agenda items fully addressed",
    "followUpRequired": true/false,
    "escalationNeeded": true/false,
    "sentiment": "positive/neutral/negative/mixed"
  }
}

CRITICAL INSTRUCTIONS:
1. Use EXACT quotes when available - never paraphrase important statements
2. Include specific numbers, dates, and commitments as stated
3. Assign clear ownership to every action and decision
4. Identify participant dynamics and contribution levels
5. Note any tensions, disagreements, or concerns raised
6. Highlight quick wins and immediate opportunities
7. Be honest about what went well and what didn't
8. Focus on VALUE - what matters most for business success

Generate only valid JSON without any markdown formatting or code blocks.`;

  return prompt;
}