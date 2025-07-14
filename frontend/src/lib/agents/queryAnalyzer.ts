import { z } from 'zod';

// Schema for analyzed query
export const AnalyzedQuerySchema = z.object({
  originalQuery: z.string(),
  intent: z.enum(['search', 'summary', 'comparison', 'action_items', 'schedule', 'general']),
  temporal: z.object({
    type: z.enum(['specific_date', 'relative', 'range', 'none']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional()
  }),
  participants: z.array(z.object({
    name: z.string(),
    type: z.enum(['self', 'person', 'team', 'company'])
  })),
  topics: z.array(z.string()),
  entities: z.array(z.object({
    text: z.string(),
    type: z.enum(['project', 'feature', 'decision', 'action', 'meeting_type'])
  })),
  confidence: z.number().min(0).max(1)
});

export type AnalyzedQuery = z.infer<typeof AnalyzedQuerySchema>;

// Helper functions for date parsing
function parseRelativeDate(text: string): { startDate: string; endDate?: string } | null {
  const now = new Date();
  const text_lower = text.toLowerCase();
  
  // Today
  if (text_lower.includes('today')) {
    return { startDate: new Date().toISOString().split('T')[0] };
  }
  
  // Yesterday
  if (text_lower.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: yesterday.toISOString().split('T')[0] };
  }
  
  // This week
  if (text_lower.includes('this week')) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return { 
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }
  
  // Last week
  if (text_lower.includes('last week')) {
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
    return { 
      startDate: startOfLastWeek.toISOString().split('T')[0],
      endDate: endOfLastWeek.toISOString().split('T')[0]
    };
  }
  
  // Last X days
  const lastDaysMatch = text_lower.match(/last (\d+) days?/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1]);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    return { 
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }
  
  // Past X weeks
  const pastWeeksMatch = text_lower.match(/past (\d+) weeks?/);
  if (pastWeeksMatch) {
    const weeks = parseInt(pastWeeksMatch[1]);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (weeks * 7));
    return { 
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }
  
  return null;
}

// Extract intent from query
function extractIntent(query: string): AnalyzedQuery['intent'] {
  const query_lower = query.toLowerCase();
  
  // Search patterns - expanded to include more natural language patterns
  if (query_lower.match(/\b(find|search|look for|where|which|what meeting|show me|tell me about|what about|explain|describe|regarding|about the)\b/)) {
    return 'search';
  }
  
  // Specific meeting reference patterns
  if (query_lower.match(/\b(\w+\s+)?meeting\b/) && !query_lower.match(/\b(next|upcoming|schedule)\b/)) {
    return 'search';
  }
  
  // Summary patterns
  if (query_lower.match(/\b(summarize|summary|overview|recap|highlights)\b/)) {
    return 'summary';
  }
  
  // Comparison patterns
  if (query_lower.match(/\b(compare|difference|between|vs)\b/)) {
    return 'comparison';
  }
  
  // Action items patterns
  if (query_lower.match(/\b(action items?|tasks?|to-?dos?|pending|assigned)\b/)) {
    return 'action_items';
  }
  
  // Schedule patterns
  if (query_lower.match(/\b(upcoming|schedule|calendar|next meeting|when is)\b/)) {
    return 'schedule';
  }
  
  return 'general';
}

// Extract participants from query
function extractParticipants(query: string): AnalyzedQuery['participants'] {
  const participants: AnalyzedQuery['participants'] = [];
  
  // Common patterns for people
  const withPattern = query.match(/with ([A-Z][a-z]+ ?[A-Z]?[a-z]*)/g);
  const fromPattern = query.match(/from ([A-Z][a-z]+ ?[A-Z]?[a-z]*)/g);
  const emailPattern = query.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  
  // Extract names after "with"
  if (withPattern) {
    withPattern.forEach(match => {
      const name = match.replace(/^with /, '').trim();
      participants.push({ name, type: 'person' });
    });
  }
  
  // Extract names after "from"
  if (fromPattern) {
    fromPattern.forEach(match => {
      const name = match.replace(/^from /, '').trim();
      participants.push({ name, type: 'person' });
    });
  }
  
  // Extract emails
  if (emailPattern) {
    emailPattern.forEach(email => {
      participants.push({ name: email, type: 'person' });
    });
  }
  
  // Check for self-references
  if (query.toLowerCase().match(/\b(my|i|me)\b/)) {
    participants.push({ name: 'self', type: 'self' });
  }
  
  // Extract team references
  const teamPattern = query.match(/\b([A-Z][a-z]+) team\b/g);
  if (teamPattern) {
    teamPattern.forEach(match => {
      const team = match.replace(/ team$/, '');
      participants.push({ name: team, type: 'team' });
    });
  }
  
  return participants;
}

// Extract topics and keywords
function extractTopics(query: string): string[] {
  const topics: string[] = [];
  
  // Extract meeting names (words before "meeting")
  const meetingNamePattern = /\b([\w\s]+?)\s+meeting\b/gi;
  const meetingMatches = query.matchAll(meetingNamePattern);
  for (const match of meetingMatches) {
    const meetingName = match[1].trim();
    // Filter out common words like "the", "a", "this"
    if (meetingName && !['the', 'a', 'an', 'this', 'that', 'our', 'my'].includes(meetingName.toLowerCase())) {
      topics.push(meetingName.toLowerCase());
    }
  }
  
  // Common business topics
  const businessTopics = [
    'sales', 'marketing', 'product', 'engineering', 'design', 'strategy',
    'budget', 'revenue', 'pricing', 'roadmap', 'launch', 'release',
    'customer', 'client', 'user', 'feedback', 'support', 'success',
    'hiring', 'interview', 'onboarding', 'performance', 'review',
    'planning', 'sprint', 'quarter', 'goals', 'okrs', 'metrics'
  ];
  
  const query_lower = query.toLowerCase();
  businessTopics.forEach(topic => {
    if (query_lower.includes(topic)) {
      topics.push(topic);
    }
  });
  
  // Extract quoted phrases as topics
  const quotedPhrases = query.match(/"([^"]+)"/g);
  if (quotedPhrases) {
    quotedPhrases.forEach(phrase => {
      topics.push(phrase.replace(/"/g, ''));
    });
  }
  
  // Extract multi-word phrases (2-3 words together)
  const words = query.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'tell', 'me', 'about', 'what', 'when', 'where', 'who', 'how', 'why', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did']);
  
  // Extract bigrams and trigrams
  for (let i = 0; i < words.length; i++) {
    // Bigrams
    if (i < words.length - 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1]) && bigram.length > 5) {
        topics.push(bigram);
      }
    }
    
    // Single important words
    if (!stopWords.has(words[i]) && words[i].length > 3) {
      topics.push(words[i]);
    }
  }
  
  // Extract project names (capitalized words that aren't common words)
  const capitalizedWords = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  const commonWords = new Set(['The', 'This', 'That', 'What', 'When', 'Where', 'Who', 'How', 'Why', 'Tell', 'Me', 'About']);
  
  if (capitalizedWords) {
    capitalizedWords.forEach(word => {
      if (!commonWords.has(word) && word.length > 3) {
        topics.push(word.toLowerCase());
      }
    });
  }
  
  return [...new Set(topics)]; // Remove duplicates
}

// Extract entities
function extractEntities(query: string): AnalyzedQuery['entities'] {
  const entities: AnalyzedQuery['entities'] = [];
  
  // Project patterns
  const projectPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+project\b/g,
    /project\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
  ];
  
  projectPatterns.forEach(pattern => {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      entities.push({ text: match[1], type: 'project' });
    }
  });
  
  // Feature patterns
  const featurePatterns = [
    /\b([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+feature\b/g,
    /feature\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\b/g
  ];
  
  featurePatterns.forEach(pattern => {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      entities.push({ text: match[1], type: 'feature' });
    }
  });
  
  // Decision patterns
  if (query.toLowerCase().includes('decision')) {
    const decisionContext = query.match(/decision(?:s)?\s+(?:about|on|regarding)\s+([a-zA-Z\s]+?)(?:\.|,|$)/i);
    if (decisionContext) {
      entities.push({ text: decisionContext[1].trim(), type: 'decision' });
    }
  }
  
  // Meeting type patterns
  const meetingTypes = ['standup', 'retrospective', 'planning', 'review', 'demo', '1:1', 'one-on-one', 'all-hands'];
  meetingTypes.forEach(type => {
    if (query.toLowerCase().includes(type)) {
      entities.push({ text: type, type: 'meeting_type' });
    }
  });
  
  return entities;
}

// Main query analyzer function
export function analyzeQuery(query: string): AnalyzedQuery {
  const intent = extractIntent(query);
  const temporalInfo = parseRelativeDate(query);
  const participants = extractParticipants(query);
  const topics = extractTopics(query);
  const entities = extractEntities(query);
  
  // Calculate confidence based on how many elements we extracted
  let confidence = 0.5; // Base confidence
  if (intent !== 'general') confidence += 0.1;
  if (temporalInfo) confidence += 0.1;
  if (participants.length > 0) confidence += 0.1;
  if (topics.length > 0) confidence += 0.1;
  if (entities.length > 0) confidence += 0.1;
  
  return {
    originalQuery: query,
    intent,
    temporal: temporalInfo ? {
      type: temporalInfo.endDate ? 'range' : 'specific_date',
      startDate: temporalInfo.startDate,
      endDate: temporalInfo.endDate,
      description: query
    } : {
      type: 'none'
    },
    participants,
    topics,
    entities,
    confidence: Math.min(confidence, 1)
  };
}

// Enhanced analyzer with AI fallback (to be implemented)
export async function analyzeQueryWithAI(query: string): Promise<AnalyzedQuery> {
  // First try rule-based analysis
  const ruleBasedAnalysis = analyzeQuery(query);
  
  // If confidence is low, we'll enhance with AI
  // For now, just return rule-based analysis
  // TODO: Implement AI enhancement for complex queries
  
  return ruleBasedAnalysis;
}