// Optimized context loading for previous conversations
// Based on the schema analysis, we should only load essential data for AI context

import type { SessionDataFull } from '@/types/app';

interface SessionWithSummary extends SessionDataFull {
  summaries?: Array<{
    tldr?: string;
    key_decisions?: string[];
    action_items?: Array<{ text: string; completed: boolean }> | string[];
    follow_up_questions?: string[];
    conversation_highlights?: string[];
    structured_notes?: string;
  }>;
  prep_checklist?: Array<{
    text: string;
    completed: boolean;
  }>;
}

export interface OptimizedConversationContext {
  sessionId: string;
  title: string;
  conversationType: string;
  date: string;
  duration: number; // in minutes
  
  // Essential summary fields only
  tldr?: string;
  keyPoints?: string[]; // Limit to top 3-5
  relevantDecisions?: string[]; // Only if directly relevant
  openActionItems?: string[]; // Only incomplete items
  sentiment?: string;
}

export function buildOptimizedContext(
  sessionData: SessionWithSummary,
  currentConversationType?: string
): string {
  const summary = sessionData.summaries?.[0];
  if (!summary) {
    return `Previous conversation: "${sessionData.title}" (${sessionData.conversation_type}) - No summary available`;
  }

  // Build minimal context focusing on continuity
  let context = `Previous: "${sessionData.title}"\n`;
  context += `Type: ${sessionData.conversation_type} | `;
  context += `Date: ${new Date(sessionData.created_at).toLocaleDateString()}\n`;
  
  // TL;DR is the most important piece
  if (summary.tldr) {
    context += `Summary: ${summary.tldr}\n`;
  }
  
  // Only include key points if they're concise (limit to 3)
  if (summary.conversation_highlights && summary.conversation_highlights.length > 0) {
    const topPoints = summary.conversation_highlights.slice(0, 3);
    context += `Key Points: ${topPoints.join('; ')}\n`;
  }
  
  // Only include open action items (not completed ones)
  if (summary.action_items && summary.action_items.length > 0) {
    const openItems = summary.action_items
      .filter((item: any) => {
        if (typeof item === 'string') return true; // Include all string items
        return typeof item === 'object' && !item.completed; // Only include uncompleted object items
      })
      .slice(0, 3);
    if (openItems.length > 0) {
      context += `Open Actions: ${openItems.map((item: any) => 
        typeof item === 'string' ? item : item.text
      ).join('; ')}\n`;
    }
  }
  
  // Only include decisions if conversation types are related
  if (currentConversationType === sessionData.conversation_type && 
      summary.key_decisions && summary.key_decisions.length > 0) {
    const relevantDecisions = summary.key_decisions.slice(0, 2);
    context += `Prior Decisions: ${relevantDecisions.join('; ')}\n`;
  }
  
  return context;
}

// Determine which fields to fetch based on conversation type relationships
export function getRequiredFields(
  currentConversationType: string,
  previousConversationType: string
): string[] {
  const baseFields = ['id', 'title', 'conversation_type', 'created_at', 'recording_duration_seconds'];
  
  // Always include basic summary fields
  const summaryFields = ['tldr', 'key_points'];
  
  // Conditionally include other fields based on conversation types
  if (currentConversationType === previousConversationType) {
    // Same type - include decisions and action items
    summaryFields.push('decisions', 'action_items', 'next_steps');
  } else if (
    (currentConversationType === 'meeting' && previousConversationType === 'sales') ||
    (currentConversationType === 'sales' && previousConversationType === 'meeting')
  ) {
    // Related types - include action items
    summaryFields.push('action_items');
  }
  
  return [...baseFields, ...summaryFields];
}

// Calculate relevance score to prioritize which conversations to load
export function calculateRelevanceScore(
  sessionData: SessionWithSummary,
  currentConversationType: string,
  daysSinceConversation: number
): number {
  let score = 0;
  
  // Type match gives highest score
  if (sessionData.conversation_type === currentConversationType) {
    score += 50;
  }
  
  // Recency matters (within last 7 days gets bonus)
  if (daysSinceConversation <= 7) {
    score += 30;
  } else if (daysSinceConversation <= 30) {
    score += 10;
  }
  
  // Has open action items
  const summary = sessionData.summaries?.[0];
  if (summary?.action_items?.some((item) => 
    typeof item === 'object' && 'completed' in item && !item.completed)) {
    score += 20;
  }
  
  return score;
}