import { analyzeQuery } from '../lib/agents/queryAnalyzer';
import { SearchPlanner } from '../lib/agents/searchPlanner';

// Test the query analysis for "Tell me about the zen sciences meeting"
const testQuery = "Tell me about the zen sciences meeting";

console.log('Testing query:', testQuery);
console.log('='.repeat(60));

// Analyze the query
const analyzedQuery = analyzeQuery(testQuery);

console.log('Analyzed Query:');
console.log('  Intent:', analyzedQuery.intent);
console.log('  Topics:', analyzedQuery.topics);
console.log('  Entities:', analyzedQuery.entities);
console.log('  Participants:', analyzedQuery.participants);
console.log('  Temporal:', analyzedQuery.temporal);
console.log('  Confidence:', analyzedQuery.confidence);

console.log('\n' + '='.repeat(60));

// Create search plan
const planner = new SearchPlanner();
const searchPlan = planner.createSearchPlan(analyzedQuery);

console.log('Search Plan:');
console.log('  Strategies:', searchPlan.strategies.length);
searchPlan.strategies.forEach((strategy, idx) => {
  console.log(`\n  Strategy ${idx + 1}:`);
  console.log('    Type:', strategy.type);
  console.log('    Priority:', strategy.priority);
  console.log('    Keywords:', strategy.filters.keywords);
  console.log('    Date Range:', strategy.filters.dateRange);
});

console.log('\n' + '='.repeat(60));

// Test with a sample meeting to see if it would match
const sampleMeeting = {
  id: '123',
  title: 'Zen Sciences Product Discussion',
  tldr: 'Discussed the zen sciences integration and roadmap',
  created_at: '2024-01-15T10:00:00Z'
};

const relevance = planner.calculateRelevance(
  sampleMeeting,
  analyzedQuery,
  searchPlan.strategies[0]
);

console.log('Sample Meeting Match:');
console.log('  Score:', relevance.score);
console.log('  Explanation:', relevance.explanation);
console.log('  Factors:', relevance.factors);