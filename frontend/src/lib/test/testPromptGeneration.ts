import { generateEnhancedSummaryPrompt, generateCoachingPrompt } from '../prompts/summaryPrompts';
import { mockTranscripts, generateMockTranscript } from './mockTranscripts';
import type { MeetingContext, SummaryPromptConfig } from '../prompts/summaryPrompts';

// Test configuration
const testConfig: SummaryPromptConfig = {
  includeEmailDraft: true,
  includeRiskAssessment: true,
  includeEffectivenessScore: true,
  includeNextMeetingTemplate: true
};

export async function testPromptGeneration() {
  console.log('🧪 Starting Prompt Generation Tests\n');
  
  // Test each type of meeting
  const meetingTypes: Array<'sales' | 'meeting' | 'general'> = ['sales', 'meeting', 'general'];
  
  for (const type of meetingTypes) {
    console.log(`\n📊 Testing ${type.toUpperCase()} Meeting Type`);
    console.log('='.repeat(50));
    
    const mockData = mockTranscripts[type];
    
    const context: MeetingContext = {
      type: type,
      agenda: type === 'meeting' ? 'Q1 Retrospective and Q2 Planning' : undefined,
      context: type === 'sales' ? 'Enterprise customer interested in analytics platform' : undefined,
      participantCount: 2,
      duration: mockData.duration
    };
    
    // Generate the enhanced summary prompt
    const summaryPrompt = generateEnhancedSummaryPrompt(
      mockData.transcript,
      context,
      testConfig
    );
    
    console.log('\n📝 Summary Prompt Length:', summaryPrompt.length);
    console.log('📝 Summary Prompt Preview (first 500 chars):');
    console.log(summaryPrompt.substring(0, 500) + '...\n');
    
    // Test the prompt with a mock AI response
    const mockSummaryResponse = await simulateAIResponse(summaryPrompt, type);
    console.log('\n🤖 Mock AI Response Structure:');
    console.log(JSON.stringify(Object.keys(mockSummaryResponse), null, 2));
    
    // Generate coaching prompt
    const coachingPrompt = generateCoachingPrompt(
      mockData.transcript,
      mockSummaryResponse,
      context
    );
    
    console.log('\n🎯 Coaching Prompt Length:', coachingPrompt.length);
    console.log('🎯 Coaching Prompt Preview (first 500 chars):');
    console.log(coachingPrompt.substring(0, 500) + '...\n');
  }
  
  console.log('\n✅ Prompt Generation Tests Completed');
}

// Simulate AI response based on meeting type
async function simulateAIResponse(prompt: string, type: string): Promise<any> {
  // This simulates what the AI might return based on the prompt structure
  const baseResponse = {
    executiveSummary: {
      oneLineSummary: `Test summary for ${type} meeting`,
      keyOutcome: 'Positive outcome achieved',
      criticalInsight: 'Important insight discovered',
      immediateAction: 'Follow up within 24 hours'
    },
    participants: [
      {
        name: 'Participant 1',
        role: 'Sales Rep',
        keyContributions: ['Presented solution', 'Addressed concerns'],
        commitments: ['Send proposal'],
        concerns: ['Timeline constraints']
      }
    ],
    discussion: {
      mainTopics: [
        {
          topic: 'Current Challenges',
          summary: 'Discussed pain points',
          outcome: 'Identified key areas',
          timeSpent: '15 minutes'
        }
      ],
      keyDecisions: [
        {
          decision: 'Move forward with POC',
          rationale: 'Meets requirements',
          owner: 'Sales team',
          deadline: 'Next week'
        }
      ],
      importantNumbers: [
        {
          metric: 'Budget',
          value: '$150,000',
          context: 'Annual budget for solution'
        }
      ]
    },
    actionItems: [
      {
        task: 'Send detailed proposal',
        owner: 'Sarah Johnson',
        deadline: 'Tomorrow EOD',
        priority: 'high',
        dependencies: [],
        successCriteria: 'Proposal includes pricing and timeline'
      }
    ],
    analysis: {
      meetingEffectiveness: {
        agendaCompletion: '5 out of 5 topics covered',
        participationBalance: 'Well balanced discussion',
        timeManagement: 'Stayed on schedule',
        outcomeClarity: 'Clear next steps defined'
      },
      momentum: {
        positive: ['Strong interest shown', 'Budget confirmed'],
        concerns: ['Competitive evaluation ongoing'],
        blockers: []
      },
      relationships: {
        strongAlignment: ['Business needs understood'],
        tensions: [],
        buildingNeeded: []
      }
    }
  };
  
  // Add type-specific fields
  if (type === 'sales') {
    return {
      ...baseResponse,
      riskAssessment: {
        immediate: [
          {
            risk: 'Competitive evaluation',
            impact: 'high',
            probability: 'medium',
            mitigation: 'Accelerate POC timeline',
            owner: 'Sales team'
          }
        ],
        monitoring: [
          {
            indicator: 'Competitor activity',
            threshold: 'Any RFP issued',
            checkDate: 'Weekly'
          }
        ]
      },
      effectivenessScore: {
        overall: 85,
        breakdown: {
          objectives: 90,
          participation: 85,
          decisions: 80,
          clarity: 85
        },
        improvements: ['Discuss implementation timeline earlier']
      },
      followUpEmail: {
        subject: 'TechFlow Solutions - Next Steps from Today\'s Discussion',
        body: 'Thank you for the productive discussion...',
        bulletPoints: ['POC timeline: 1 week', 'Budget confirmed: $150k'],
        callToAction: 'Review proposal and confirm POC start date'
      }
    };
  }
  
  return baseResponse;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPromptGeneration().catch(console.error);
}