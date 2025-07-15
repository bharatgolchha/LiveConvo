import { AnalyzedQuery } from './queryAnalyzer';
import { z } from 'zod';

// Search strategy types
export const SearchStrategySchema = z.object({
  type: z.enum(['temporal', 'participant', 'topic', 'entity', 'hybrid']),
  priority: z.number().min(1).max(5),
  filters: z.object({
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional(),
    participants: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    sessionIds: z.array(z.string()).optional(),
    excludeSessionIds: z.array(z.string()).optional()
  }),
  limit: z.number().default(10),
  expansionStrategy: z.enum(['none', 'temporal_expand', 'keyword_expand', 'participant_expand']).optional()
});

export type SearchStrategy = z.infer<typeof SearchStrategySchema>;

// Search plan schema
export const SearchPlanSchema = z.object({
  queryId: z.string(),
  strategies: z.array(SearchStrategySchema),
  maxResults: z.number().default(20),
  timeoutMs: z.number().default(5000),
  fallbackStrategy: SearchStrategySchema.optional()
});

export type SearchPlan = z.infer<typeof SearchPlanSchema>;

// Search result relevance
export interface SearchRelevance {
  score: number;
  factors: {
    temporal: number;
    textual: number;
    participant: number;
    entity: number;
  };
  explanation: string;
}

export class SearchPlanner {
  // Create a search plan based on analyzed query
  createSearchPlan(analyzedQuery: AnalyzedQuery): SearchPlan {
    const strategies: SearchStrategy[] = [];
    
    // 1. Primary strategy based on intent
    switch (analyzedQuery.intent) {
      case 'search':
        strategies.push(...this.createSearchStrategies(analyzedQuery));
        break;
      
      case 'summary':
        strategies.push(this.createSummaryStrategy(analyzedQuery));
        break;
      
      case 'action_items':
        strategies.push(this.createActionItemsStrategy(analyzedQuery));
        break;
      
      case 'schedule':
        strategies.push(this.createScheduleStrategy(analyzedQuery));
        break;
      
      case 'comparison':
        strategies.push(...this.createComparisonStrategies(analyzedQuery));
        break;
      
      default:
        strategies.push(this.createGeneralStrategy(analyzedQuery));
    }
    
    // 2. Add fallback strategy if confidence is low OR if we have good keywords
    let fallbackStrategy: SearchStrategy | undefined;
    if (analyzedQuery.confidence < 0.7 || analyzedQuery.topics.length > 0) {
      fallbackStrategy = this.createFallbackStrategy(analyzedQuery);
    }
    
    return {
      queryId: this.generateQueryId(),
      strategies: this.prioritizeStrategies(strategies),
      maxResults: this.calculateMaxResults(analyzedQuery),
      timeoutMs: 5000,
      fallbackStrategy
    };
  }
  
  private createSearchStrategies(query: AnalyzedQuery): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];
    
    // Temporal strategy if date info exists
    if (query.temporal.type !== 'none') {
      strategies.push({
        type: 'temporal',
        priority: 1,
        filters: {
          dateRange: {
            start: query.temporal.startDate,
            end: query.temporal.endDate
          },
          keywords: query.topics
        },
        limit: 15
      });
    }
    
    // Participant strategy if participants mentioned
    if (query.participants.length > 0) {
      strategies.push({
        type: 'participant',
        priority: query.temporal.type === 'none' ? 1 : 2,
        filters: {
          participants: query.participants.map(p => p.name),
          keywords: query.topics,
          dateRange: query.temporal.type !== 'none' ? {
            start: query.temporal.startDate,
            end: query.temporal.endDate
          } : undefined // Don't limit date range unless specified
        },
        limit: 10
      });
    }
    
    // Topic strategy for keyword search
    if (query.topics.length > 0) {
      strategies.push({
        type: 'topic',
        priority: 3,
        filters: {
          keywords: query.topics,
          dateRange: query.temporal.type !== 'none' ? {
            start: query.temporal.startDate,
            end: query.temporal.endDate
          } : undefined
        },
        limit: 10,
        expansionStrategy: 'keyword_expand'
      });
    }
    
    // Entity strategy for specific items
    if (query.entities.length > 0) {
      strategies.push({
        type: 'entity',
        priority: 2,
        filters: {
          keywords: query.entities.map(e => e.text)
        },
        limit: 10
      });
    }
    
    // If no specific strategies, use hybrid
    if (strategies.length === 0) {
      strategies.push({
        type: 'hybrid',
        priority: 1,
        filters: {
          keywords: this.extractAllKeywords(query)
        },
        limit: 20,
        expansionStrategy: 'keyword_expand'
      });
    }
    
    return strategies;
  }
  
  private createSummaryStrategy(query: AnalyzedQuery): SearchStrategy {
    return {
      type: 'temporal',
      priority: 1,
      filters: {
        dateRange: query.temporal.type !== 'none' ? {
          start: query.temporal.startDate,
          end: query.temporal.endDate
        } : {
          // Default to last week if no date specified
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        participants: query.participants.length > 0 
          ? query.participants.map(p => p.name)
          : undefined,
        keywords: query.topics.length > 0 ? query.topics : undefined
      },
      limit: 50 // More results for summaries
    };
  }
  
  private createActionItemsStrategy(query: AnalyzedQuery): SearchStrategy {
    return {
      type: 'hybrid',
      priority: 1,
      filters: {
        keywords: ['action', 'task', 'todo', ...query.topics],
        participants: query.participants.length > 0 
          ? query.participants.map(p => p.name)
          : undefined,
        dateRange: query.temporal.type !== 'none' ? {
          start: query.temporal.startDate,
          end: query.temporal.endDate
        } : undefined
      },
      limit: 30
    };
  }
  
  private createScheduleStrategy(query: AnalyzedQuery): SearchStrategy {
    return {
      type: 'temporal',
      priority: 1,
      filters: {
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next 30 days
        },
        keywords: query.topics.length > 0 ? query.topics : undefined,
        participants: query.participants.length > 0 
          ? query.participants.map(p => p.name)
          : undefined
      },
      limit: 20
    };
  }
  
  private createComparisonStrategies(query: AnalyzedQuery): SearchStrategy[] {
    // For comparisons, we need multiple targeted searches
    const strategies: SearchStrategy[] = [];
    
    // Extract comparison targets
    const comparisonTargets = this.extractComparisonTargets(query.originalQuery);
    
    comparisonTargets.forEach((target, index) => {
      strategies.push({
        type: 'topic',
        priority: index + 1,
        filters: {
          keywords: [target, ...query.topics],
          dateRange: query.temporal.type !== 'none' ? {
            start: query.temporal.startDate,
            end: query.temporal.endDate
          } : undefined
        },
        limit: 10
      });
    });
    
    return strategies;
  }
  
  private createGeneralStrategy(query: AnalyzedQuery): SearchStrategy {
    return {
      type: 'hybrid',
      priority: 1,
      filters: {
        keywords: this.extractAllKeywords(query),
        participants: query.participants.length > 0 
          ? query.participants.map(p => p.name)
          : undefined,
        dateRange: query.temporal.type !== 'none' ? {
          start: query.temporal.startDate,
          end: query.temporal.endDate
        } : undefined // Don't limit date range for general searches
      },
      limit: 15,
      expansionStrategy: 'keyword_expand'
    };
  }
  
  private createFallbackStrategy(query: AnalyzedQuery): SearchStrategy {
    return {
      type: 'hybrid',
      priority: 5,
      filters: {
        keywords: this.extractAllKeywords(query),
        // No date range for fallback - search all time
        dateRange: undefined
      },
      limit: 30,
      expansionStrategy: 'keyword_expand'
    };
  }
  
  private extractAllKeywords(query: AnalyzedQuery): string[] {
    const keywords = [...query.topics];
    
    // Add entity texts
    query.entities.forEach(entity => {
      keywords.push(entity.text);
    });
    
    // Add significant words from original query
    const significantWords = query.originalQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !['about', 'with', 'from', 'what', 'when', 'where', 'which', 'that', 'this', 'these', 'those'].includes(word)
      );
    
    keywords.push(...significantWords);
    
    return [...new Set(keywords)]; // Remove duplicates
  }
  
  private extractComparisonTargets(query: string): string[] {
    const targets: string[] = [];
    
    // Look for "X vs Y" or "X and Y" patterns
    const vsPattern = /(\w+(?:\s+\w+)*)\s+(?:vs\.?|versus|compared to|and)\s+(\w+(?:\s+\w+)*)/i;
    const match = query.match(vsPattern);
    
    if (match) {
      targets.push(match[1].trim(), match[2].trim());
    }
    
    // Look for "between X and Y" pattern
    const betweenPattern = /between\s+(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)/i;
    const betweenMatch = query.match(betweenPattern);
    
    if (betweenMatch) {
      targets.push(betweenMatch[1].trim(), betweenMatch[2].trim());
    }
    
    return targets;
  }
  
  private prioritizeStrategies(strategies: SearchStrategy[]): SearchStrategy[] {
    // Sort by priority (lower number = higher priority)
    return strategies.sort((a, b) => a.priority - b.priority);
  }
  
  private calculateMaxResults(query: AnalyzedQuery): number {
    switch (query.intent) {
      case 'summary':
        return 50; // Need more results for comprehensive summaries
      case 'action_items':
        return 30;
      case 'schedule':
        return 20;
      case 'search':
        return 15;
      default:
        return 20;
    }
  }
  
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate relevance score for a search result
  calculateRelevance(
    result: {
      created_at?: string;
      title?: string;
      tldr?: string;
      summary?: string;
      participant_me?: string;
      participant_them?: string;
      attendees?: string[];
    },
    analyzedQuery: AnalyzedQuery,
    strategy: SearchStrategy
  ): SearchRelevance {
    const factors = {
      temporal: 0,
      textual: 0,
      participant: 0,
      entity: 0
    };
    
    // Temporal relevance
    if (analyzedQuery.temporal.type !== 'none' && result.created_at) {
      const resultDate = new Date(result.created_at);
      const queryStart = new Date(analyzedQuery.temporal.startDate!);
      const queryEnd = analyzedQuery.temporal.endDate 
        ? new Date(analyzedQuery.temporal.endDate)
        : queryStart;
      
      if (resultDate >= queryStart && resultDate <= queryEnd) {
        factors.temporal = 1.0;
      } else {
        // Decay based on distance from date range
        const distance = Math.min(
          Math.abs(resultDate.getTime() - queryStart.getTime()),
          Math.abs(resultDate.getTime() - queryEnd.getTime())
        );
        const daysDiff = distance / (1000 * 60 * 60 * 24);
        factors.temporal = Math.max(0, 1 - (daysDiff / 30)); // Decay over 30 days
      }
    }
    
    // Textual relevance
    const content = (result.title || '') + ' ' + (result.tldr || '') + ' ' + (result.summary || '');
    const contentLower = content.toLowerCase();
    
    let matchCount = 0;
    analyzedQuery.topics.forEach(topic => {
      if (contentLower.includes(topic.toLowerCase())) {
        matchCount++;
      }
    });
    
    factors.textual = analyzedQuery.topics.length > 0 
      ? matchCount / analyzedQuery.topics.length 
      : 0.5;
    
    // Participant relevance
    if (analyzedQuery.participants.length > 0) {
      const resultParticipants = [
        result.participant_me,
        result.participant_them,
        ...(result.attendees || [])
      ].filter((p): p is string => Boolean(p)).map(p => p.toLowerCase());
      
      let participantMatches = 0;
      analyzedQuery.participants.forEach(participant => {
        if (participant.type === 'self' || 
            resultParticipants.some(rp => rp.includes(participant.name.toLowerCase()))) {
          participantMatches++;
        }
      });
      
      factors.participant = participantMatches / analyzedQuery.participants.length;
    }
    
    // Entity relevance
    if (analyzedQuery.entities.length > 0) {
      let entityMatches = 0;
      analyzedQuery.entities.forEach(entity => {
        if (contentLower.includes(entity.text.toLowerCase())) {
          entityMatches++;
        }
      });
      
      factors.entity = entityMatches / analyzedQuery.entities.length;
    }
    
    // Calculate weighted score based on strategy type
    let score = 0;
    switch (strategy.type) {
      case 'temporal':
        score = factors.temporal * 0.5 + factors.textual * 0.3 + factors.participant * 0.1 + factors.entity * 0.1;
        break;
      case 'participant':
        score = factors.participant * 0.5 + factors.textual * 0.3 + factors.temporal * 0.1 + factors.entity * 0.1;
        break;
      case 'topic':
        score = factors.textual * 0.5 + factors.entity * 0.2 + factors.temporal * 0.2 + factors.participant * 0.1;
        break;
      case 'entity':
        score = factors.entity * 0.5 + factors.textual * 0.3 + factors.temporal * 0.1 + factors.participant * 0.1;
        break;
      default:
        // Equal weighting for hybrid
        score = (factors.temporal + factors.textual + factors.participant + factors.entity) / 4;
    }
    
    // Generate explanation
    const explanationParts: string[] = [];
    if (factors.temporal > 0.5) explanationParts.push('Strong date match');
    if (factors.textual > 0.5) explanationParts.push(`${Math.round(factors.textual * 100)}% keyword match`);
    if (factors.participant > 0.5) explanationParts.push('Participant match');
    if (factors.entity > 0.5) explanationParts.push('Entity match');
    
    return {
      score,
      factors,
      explanation: explanationParts.join(', ') || 'Partial match'
    };
  }
}