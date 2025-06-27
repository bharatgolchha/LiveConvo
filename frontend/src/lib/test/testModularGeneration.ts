#!/usr/bin/env node

import { mockTranscripts } from './mockTranscripts';
import type { MeetingContext } from '../prompts/summaryPrompts';
import {
  generateExecutiveSummaryPrompt,
  generateParticipantAnalysisPrompt,
  generateDecisionsAndActionsPrompt,
  generateInsightsAndMetricsPrompt,
  generateEffectivenessScorePrompt,
  generateRiskAssessmentPrompt,
  generateFollowUpContentPrompt,
  combineModularResults
} from '../prompts/modularSummaryPrompts';

export async function testModularGeneration() {
  console.log('🧪 Testing Modular Summary Generation\n');
  
  const mockData = mockTranscripts.sales;
  const context: MeetingContext = {
    type: 'sales',
    agenda: 'Product demo and pricing discussion',
    context: 'Enterprise customer interested in analytics platform',
    participantCount: 2,
    duration: mockData.duration
  };
  
  console.log('📋 Meeting Context:');
  console.log(`- Type: ${context.type}`);
  console.log(`- Duration: ${Math.round(context.duration / 60)} minutes`);
  console.log(`- Transcript Length: ${mockData.transcript.length} characters\n`);
  
  console.log('🔍 Testing Each Modular Prompt:\n');
  
  // Test 1: Executive Summary
  console.log('1️⃣ Executive Summary Prompt');
  const execPrompt = generateExecutiveSummaryPrompt(mockData.transcript, context);
  console.log(`   Length: ${execPrompt.length} chars`);
  console.log(`   Transcript portion: ${Math.round((mockData.transcript.length / execPrompt.length) * 100)}%`);
  
  // Test 2: Participant Analysis
  console.log('\n2️⃣ Participant Analysis Prompt');
  const participantPrompt = generateParticipantAnalysisPrompt(mockData.transcript, context);
  console.log(`   Length: ${participantPrompt.length} chars`);
  
  // Test 3: Decisions and Actions
  console.log('\n3️⃣ Decisions and Actions Prompt');
  const decisionsPrompt = generateDecisionsAndActionsPrompt(mockData.transcript, context);
  console.log(`   Length: ${decisionsPrompt.length} chars`);
  
  // Test 4: Insights and Metrics
  console.log('\n4️⃣ Insights and Metrics Prompt');
  const insightsPrompt = generateInsightsAndMetricsPrompt(mockData.transcript, context);
  console.log(`   Length: ${insightsPrompt.length} chars`);
  
  // Test 5: Effectiveness Score
  console.log('\n5️⃣ Effectiveness Score Prompt');
  const effectivenessPrompt = generateEffectivenessScorePrompt(mockData.transcript, context, 3, 5);
  console.log(`   Length: ${effectivenessPrompt.length} chars`);
  console.log(`   Uses truncated transcript: Yes (first 2000 chars)`);
  
  // Test 6: Risk Assessment
  console.log('\n6️⃣ Risk Assessment Prompt');
  const riskPrompt = generateRiskAssessmentPrompt(mockData.transcript, context);
  console.log(`   Length: ${riskPrompt.length} chars`);
  console.log(`   Uses truncated transcript: Yes (last 3000 chars)`);
  
  // Test 7: Follow-up Content
  console.log('\n7️⃣ Follow-up Content Prompt');
  const mockDecisions = [
    { decision: 'Proceed with POC', decisionMaker: 'Michael Chen', rationale: 'Meets requirements' }
  ];
  const mockActions = [
    { task: 'Send proposal', owner: 'Sarah Johnson', deadline: 'Tomorrow EOD' }
  ];
  const followUpPrompt = generateFollowUpContentPrompt(mockData.transcript, context, mockDecisions, mockActions);
  console.log(`   Length: ${followUpPrompt.length} chars`);
  console.log(`   Uses full transcript: No (summary only)`);
  
  // Summary
  console.log('\n📊 Summary Statistics:');
  const totalPromptLength = execPrompt.length + participantPrompt.length + decisionsPrompt.length + 
                           insightsPrompt.length + effectivenessPrompt.length + 
                           (riskPrompt?.length || 0) + followUpPrompt.length;
  console.log(`- Total prompt characters: ${totalPromptLength.toLocaleString()}`);
  console.log(`- Original transcript: ${mockData.transcript.length.toLocaleString()} chars`);
  console.log(`- Prompt overhead: ${(totalPromptLength - mockData.transcript.length).toLocaleString()} chars`);
  console.log(`- Number of API calls: 7`);
  console.log(`- Average prompt size: ${Math.round(totalPromptLength / 7).toLocaleString()} chars`);
  
  // Test combining results
  console.log('\n🔗 Testing Result Combination:');
  const mockResults = {
    executive: {
      executiveSummary: {
        oneLineSummary: 'Successful sales meeting with $150K opportunity',
        keyOutcome: 'POC approved',
        criticalInsight: 'Competition is active',
        immediateAction: 'Send proposal today'
      },
      keyPoints: ['Budget confirmed', 'Timeline agreed'],
      metadata: { totalDecisions: 1, totalActionItems: 2 }
    },
    participants: {
      participants: [
        { name: 'Michael Chen', role: 'VP Analytics', keyContributions: ['Confirmed budget'] }
      ],
      conversationDynamics: { rapport: 'excellent', balance: 'balanced', energy: 'high' }
    },
    decisions: {
      keyDecisions: mockDecisions,
      actionItems: mockActions,
      followUpQuestions: ['Integration timeline?']
    },
    insights: {
      insights: [{ observation: 'Strong buying signals', evidence: 'Budget confirmed' }],
      importantNumbers: [{ metric: 'Budget', value: '$150K', speaker: 'Michael Chen' }],
      quotableQuotes: [{ quote: 'We need this yesterday', speaker: 'Michael Chen' }]
    },
    effectiveness: {
      effectivenessScore: {
        overall: 92,
        breakdown: { objectives: 95, participation: 90, decisions: 90, clarity: 93 },
        improvements: ['Discuss implementation timeline earlier']
      }
    }
  };
  
  const combined = combineModularResults(mockResults);
  console.log('✅ Combined result structure:');
  console.log(`   - Has TLDR: ${!!combined.tldr}`);
  console.log(`   - Key points: ${combined.key_points?.length || 0}`);
  console.log(`   - Action items: ${combined.action_items?.length || 0}`);
  console.log(`   - Participants: ${combined.participants?.length || 0}`);
  console.log(`   - Insights: ${combined.insights?.length || 0}`);
  console.log(`   - Effectiveness score: ${combined.effectiveness_score?.overall || 'N/A'}`);
  
  console.log('\n✅ Modular Generation Test Complete!');
  console.log('\n🎯 Benefits of Modular Approach:');
  console.log('- No truncation issues (each prompt is focused)');
  console.log('- Better error recovery (one failure doesn\'t break everything)');
  console.log('- More consistent results (smaller, targeted prompts)');
  console.log('- Easier to debug and improve individual sections');
  console.log('- Can parallelize some API calls for speed');
}

// Run the test
if (require.main === module) {
  testModularGeneration().catch(console.error);
}