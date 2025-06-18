import * as React from 'react';
import { config } from './config';

/**
 * AI Guidance Engine for liveprompt.ai
 * 
 * Analyzes live conversation transcripts and provides real-time guidance
 * suggestions based on uploaded context and conversation flow.
 */

export interface GuidanceRequest {
  transcript: string;
  context: string;
  userContext?: string;
  conversationType?: 'sales' | 'support' | 'meeting' | 'interview';
  participantRole?: 'host' | 'participant' | 'interviewer' | 'interviewee';
  participantMe?: string;
  participantThem?: string;
}

export interface GuidanceSuggestion {
  id: string;
  type: 'ask' | 'clarify' | 'avoid' | 'suggest' | 'warn';
  message: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

interface AIGuidanceResponse {
  suggestions: Array<{
    type?: string;
    message?: string;
    confidence?: number;
    reasoning?: string;
    priority?: string;
  }>;
}

export interface ContextDocument {
  id: string;
  name: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'user_input';
  uploadedAt: Date;
}

export class AIGuidanceEngine {
  private contextDocuments: ContextDocument[] = [];
  private conversationHistory: string[] = [];
  private lastGuidanceTime: number = 0;
  private guidanceThrottleMs: number = 10000; // Minimum 10 seconds between guidance

  constructor() {
    // API key is now handled server-side
  }

  /**
   * Add context documents for guidance analysis
   */
  addContextDocument(document: ContextDocument): void {
    this.contextDocuments.push(document);
  }

  /**
   * Remove a context document
   */
  removeContextDocument(documentId: string): void {
    this.contextDocuments = this.contextDocuments.filter(doc => doc.id !== documentId);
  }

  /**
   * Add user-provided text context
   */
  addUserContext(text: string): void {
    const userDoc: ContextDocument = {
      id: `user_${Date.now()}`,
      name: 'User Context',
      content: text,
      type: 'user_input',
      uploadedAt: new Date()
    };
    this.addContextDocument(userDoc);
  }

  /**
   * Generate AI guidance based on current conversation state
   */
  async generateGuidance(request: GuidanceRequest): Promise<GuidanceSuggestion[]> {
    // Throttle guidance generation
    const now = Date.now();
    if (now - this.lastGuidanceTime < this.guidanceThrottleMs) {
      return [];
    }

    try {
      this.lastGuidanceTime = now;
      
      // Build context from uploaded documents
      const contextSummary = this.buildContextSummary();
      
      // Call our API route instead of OpenAI directly
      const response = await fetch(`${config.app.apiUrl}/api/guidance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: request.transcript,
          context: contextSummary,
          userContext: request.userContext,
          conversationType: request.conversationType,
          participantRole: request.participantRole,
          participantMe: request.participantMe,
          participantThem: request.participantThem
        })
      });

      if (!response.ok) {
        throw new Error(`Guidance API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.parseGuidanceResponse(data);
      
    } catch (error) {
      console.error('Failed to generate AI guidance:', error);
      return this.getFallbackGuidance(request);
    }
  }



  /**
   * Build summary of context documents
   */
  private buildContextSummary(): string {
    if (this.contextDocuments.length === 0) {
      return 'No context documents provided';
    }

    return this.contextDocuments.map(doc => 
      `${doc.name} (${doc.type}): ${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}`
    ).join('\n\n');
  }

  /**
   * Parse the AI response into guidance suggestions
   */
  private parseGuidanceResponse(data: AIGuidanceResponse): GuidanceSuggestion[] {
    try {
      const suggestions = data.suggestions || [];
      
      return suggestions.map((suggestion) => ({
        id: Math.random().toString(36).substring(7),
        type: (suggestion.type as 'ask' | 'clarify' | 'avoid' | 'suggest' | 'warn') || 'suggest',
        message: suggestion.message || 'No message provided',
        confidence: Math.min(Math.max(suggestion.confidence || 50, 0), 100),
        reasoning: suggestion.reasoning || 'No reasoning provided',
        timestamp: new Date(),
        priority: (suggestion.priority as 'low' | 'medium' | 'high') || 'medium'
      }));
      
    } catch (error) {
      console.error('Failed to parse guidance response:', error);
      return [];
    }
  }

  /**
   * Provide fallback guidance when AI is unavailable
   */
  private getFallbackGuidance(request: GuidanceRequest): GuidanceSuggestion[] {
    const fallbackSuggestions = [
      {
        id: 'fallback_1',
        type: 'ask' as const,
        message: 'Ask an open-ended question to encourage more detailed responses',
        confidence: 75,
        reasoning: 'Open questions help gather more information',
        timestamp: new Date(),
        priority: 'medium' as const
      },
      {
        id: 'fallback_2', 
        type: 'clarify' as const,
        message: 'Summarize what you heard to ensure understanding',
        confidence: 80,
        reasoning: 'Clarification prevents miscommunication',
        timestamp: new Date(),
        priority: 'medium' as const
      }
    ];

    // Return one random fallback suggestion
    return [fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)]];
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(transcript: string): void {
    this.conversationHistory.push(transcript);
    
    // Keep only last 10 entries to manage memory
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * Get conversation context for guidance
   */
  getConversationContext(): string {
    return this.conversationHistory.join('\n');
  }

  /**
   * Clear all context and history
   */
  clearContext(): void {
    this.contextDocuments = [];
    this.conversationHistory = [];
    this.lastGuidanceTime = 0;
  }
}

/**
 * Hook for using AI guidance in React components
 */
export function useAIGuidance() {
  const [guidanceEngine] = React.useState(() => new AIGuidanceEngine());
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generateGuidance = React.useCallback(async (request: GuidanceRequest) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const suggestions = await guidanceEngine.generateGuidance(request);
      return suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate guidance';
      setError(errorMessage);
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, [guidanceEngine]);

  const addContext = React.useCallback((document: ContextDocument) => {
    guidanceEngine.addContextDocument(document);
  }, [guidanceEngine]);

  const addUserContext = React.useCallback((text: string) => {
    guidanceEngine.addUserContext(text);
  }, [guidanceEngine]);

  const clearContext = React.useCallback(() => {
    guidanceEngine.clearContext();
  }, [guidanceEngine]);

  return {
    generateGuidance,
    addContext,
    addUserContext,
    clearContext,
    isGenerating,
    error,
    guidanceEngine
  };
}

 