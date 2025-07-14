import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuery } from '@/lib/agents/queryAnalyzer';
import { SearchPlanner } from '@/lib/agents/searchPlanner';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || "Tell me about the zen sciences meeting";
  
  // Analyze the query
  const analyzedQuery = analyzeQuery(query);
  
  // Create search plan
  const planner = new SearchPlanner();
  const searchPlan = planner.createSearchPlan(analyzedQuery);
  
  // Test with a sample meeting
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
  
  return NextResponse.json({
    query,
    analysis: {
      intent: analyzedQuery.intent,
      topics: analyzedQuery.topics,
      entities: analyzedQuery.entities,
      participants: analyzedQuery.participants,
      temporal: analyzedQuery.temporal,
      confidence: analyzedQuery.confidence
    },
    searchPlan: {
      strategies: searchPlan.strategies.map(s => ({
        type: s.type,
        priority: s.priority,
        keywords: s.filters.keywords,
        dateRange: s.filters.dateRange
      }))
    },
    sampleMatch: {
      score: relevance.score,
      explanation: relevance.explanation,
      factors: relevance.factors
    }
  });
}