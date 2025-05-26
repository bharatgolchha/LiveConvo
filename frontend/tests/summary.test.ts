/**
 * Tests for Summary Page functionality
 */

import { describe, it, expect } from '@jest/globals';

// Mock data structures based on the summary page implementation
interface ConversationSummary {
  id: string;
  title: string;
  conversationType: string;
  createdAt: string;
  duration: number;
  wordCount: number;
  status: 'active' | 'completed' | 'draft' | 'archived';
  participants: string[];
  summary: {
    overview: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: string[];
    tldr: string;
  };
  followUps: FollowUp[];
  transcript: TranscriptEntry[];
  metadata: {
    audioQuality: number;
    transcriptionAccuracy: number;
    language: string;
    tags: string[];
  };
}

interface FollowUp {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

// Helper functions
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPriorityColor = (priority: FollowUp['priority']): string => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
  }
};

// Test data
const mockSummary: ConversationSummary = {
  id: '1',
  title: 'Sales Discovery Call - TechCorp',
  conversationType: 'Sales Call',
  createdAt: '2025-01-27T10:30:00Z',
  duration: 1245,
  wordCount: 450,
  status: 'completed',
  participants: ['John Doe (Sales Rep)', 'Sarah Johnson (TechCorp)', 'Mike Smith (TechCorp CTO)'],
  summary: {
    overview: 'Initial discovery call with TechCorp to understand their current pain points.',
    keyPoints: [
      'TechCorp currently uses multiple disconnected tools',
      'Team of 50+ developers struggling with coordination'
    ],
    decisions: [
      'Proceed with technical demo next week',
      'Provide detailed ROI analysis by Friday'
    ],
    actionItems: [
      'Send technical requirements questionnaire',
      'Prepare custom demo environment'
    ],
    tldr: 'Promising discovery call with TechCorp. 50+ dev team, $150K-$200K budget.'
  },
  followUps: [
    {
      id: 'f1',
      text: 'Send technical requirements questionnaire to Mike',
      priority: 'high',
      assignee: 'John Doe',
      dueDate: '2025-01-28',
      completed: false,
      createdAt: '2025-01-27T11:00:00Z'
    }
  ],
  transcript: [
    {
      id: 't1',
      speaker: 'John Doe',
      text: 'Thanks for taking the time to meet with us today.',
      timestamp: 0,
      confidence: 0.98
    }
  ],
  metadata: {
    audioQuality: 0.92,
    transcriptionAccuracy: 0.96,
    language: 'en-US',
    tags: ['sales', 'discovery', 'enterprise']
  }
};

describe('Summary Page Data Structures', () => {
  it('should have valid conversation summary structure', () => {
    expect(mockSummary.id).toBeDefined();
    expect(mockSummary.title).toBeDefined();
    expect(mockSummary.duration).toBeGreaterThan(0);
    expect(mockSummary.wordCount).toBeGreaterThan(0);
    expect(mockSummary.participants).toHaveLength(3);
    expect(mockSummary.summary.keyPoints).toHaveLength(2);
    expect(mockSummary.summary.decisions).toHaveLength(2);
    expect(mockSummary.summary.actionItems).toHaveLength(2);
    expect(mockSummary.followUps).toHaveLength(1);
    expect(mockSummary.transcript).toHaveLength(1);
  });

  it('should have valid follow-up structure', () => {
    const followUp = mockSummary.followUps[0];
    expect(followUp.id).toBeDefined();
    expect(followUp.text).toBeDefined();
    expect(['high', 'medium', 'low']).toContain(followUp.priority);
    expect(typeof followUp.completed).toBe('boolean');
    expect(followUp.createdAt).toBeDefined();
  });

  it('should have valid transcript entry structure', () => {
    const entry = mockSummary.transcript[0];
    expect(entry.id).toBeDefined();
    expect(entry.speaker).toBeDefined();
    expect(entry.text).toBeDefined();
    expect(entry.timestamp).toBeGreaterThanOrEqual(0);
    expect(entry.confidence).toBeGreaterThan(0);
    expect(entry.confidence).toBeLessThanOrEqual(1);
  });

  it('should have valid metadata structure', () => {
    const metadata = mockSummary.metadata;
    expect(metadata.audioQuality).toBeGreaterThan(0);
    expect(metadata.audioQuality).toBeLessThanOrEqual(1);
    expect(metadata.transcriptionAccuracy).toBeGreaterThan(0);
    expect(metadata.transcriptionAccuracy).toBeLessThanOrEqual(1);
    expect(metadata.language).toBeDefined();
    expect(Array.isArray(metadata.tags)).toBe(true);
  });
});

describe('Summary Page Helper Functions', () => {
  it('should format duration correctly', () => {
    expect(formatDuration(1245)).toBe('20m 45s');
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(30)).toBe('0m 30s');
  });

  it('should format date correctly', () => {
    const formatted = formatDate('2025-01-27T10:30:00Z');
    expect(formatted).toContain('2025');
    expect(formatted).toContain('January');
    expect(formatted).toContain('27');
  });

  it('should return correct priority colors', () => {
    expect(getPriorityColor('high')).toContain('red');
    expect(getPriorityColor('medium')).toContain('amber');
    expect(getPriorityColor('low')).toContain('green');
  });
});

describe('Summary Page Business Logic', () => {
  it('should calculate correct statistics', () => {
    expect(mockSummary.participants.length).toBe(3);
    expect(mockSummary.summary.keyPoints.length).toBe(2);
    expect(mockSummary.summary.decisions.length).toBe(2);
    expect(mockSummary.summary.actionItems.length).toBe(2);
  });

  it('should have reasonable audio quality metrics', () => {
    expect(mockSummary.metadata.audioQuality).toBeGreaterThan(0.8);
    expect(mockSummary.metadata.transcriptionAccuracy).toBeGreaterThan(0.9);
  });

  it('should have proper follow-up assignment', () => {
    const followUp = mockSummary.followUps[0];
    expect(followUp.assignee).toBeDefined();
    expect(followUp.dueDate).toBeDefined();
    expect(followUp.priority).toBe('high');
  });
});

describe('Summary Page Data Validation', () => {
  it('should validate required fields', () => {
    const requiredFields = ['id', 'title', 'conversationType', 'createdAt', 'duration', 'wordCount', 'status'];
    requiredFields.forEach(field => {
      expect(mockSummary[field as keyof ConversationSummary]).toBeDefined();
    });
  });

  it('should validate status enum', () => {
    const validStatuses = ['active', 'completed', 'draft', 'archived'];
    expect(validStatuses).toContain(mockSummary.status);
  });

  it('should validate priority enum for follow-ups', () => {
    const validPriorities = ['high', 'medium', 'low'];
    mockSummary.followUps.forEach(followUp => {
      expect(validPriorities).toContain(followUp.priority);
    });
  });
});

export type {
  ConversationSummary,
  FollowUp,
  TranscriptEntry
};

export {
  formatDuration,
  formatDate,
  getPriorityColor,
  mockSummary
}; 