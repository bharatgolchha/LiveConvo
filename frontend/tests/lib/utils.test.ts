import { 
  formatConversationDate, 
  formatConversationDateRange, 
  getConversationEndDate,
  getConversationStatusWithDate
} from '@/lib/utils';

describe('Conversation Date Utilities', () => {
  const mockSession = {
    id: 'test-session',
    status: 'completed',
    created_at: '2025-01-30T10:00:00Z',
    recording_started_at: '2025-01-30T10:05:00Z',
    recording_ended_at: '2025-01-30T11:00:00Z',
    finalized_at: '2025-01-30T11:05:00Z'
  };

  describe('formatConversationDate', () => {
    it('should format date for dashboard context', () => {
      const result = formatConversationDate(mockSession.created_at, 'dashboard');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for detail context', () => {
      const result = formatConversationDate(mockSession.created_at, 'detail');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for relative context', () => {
      const result = formatConversationDate(mockSession.created_at, 'relative');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatConversationDateRange', () => {
    it('should format date range for dashboard context', () => {
      const result = formatConversationDateRange(
        mockSession.recording_started_at!,
        mockSession.recording_ended_at!,
        'dashboard'
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain(' - ');
    });

    it('should format date range for detail context', () => {
      const result = formatConversationDateRange(
        mockSession.recording_started_at!,
        mockSession.recording_ended_at!,
        'detail'
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle missing end date', () => {
      const result = formatConversationDateRange(
        mockSession.recording_started_at!,
        undefined,
        'dashboard'
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Started');
    });
  });

  describe('getConversationEndDate', () => {
    it('should return finalized_at when available', () => {
      const result = getConversationEndDate(mockSession);
      expect(result).toBe(mockSession.finalized_at);
    });

    it('should return recording_ended_at when finalized_at is not available', () => {
      const sessionWithoutFinalized = { ...mockSession, finalized_at: undefined };
      const result = getConversationEndDate(sessionWithoutFinalized);
      expect(result).toBe(mockSession.recording_ended_at);
    });

    it('should return null when no end dates are available', () => {
      const sessionWithoutEnd = { 
        ...mockSession, 
        finalized_at: undefined, 
        recording_ended_at: undefined 
      };
      const result = getConversationEndDate(sessionWithoutEnd);
      expect(result).toBeNull();
    });
  });

  describe('getConversationStatusWithDate', () => {
    it('should return status with date for completed session', () => {
      const result = getConversationStatusWithDate(mockSession);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('completed');
    });

    it('should return status with date for active session', () => {
      const activeSession = { ...mockSession, status: 'active', finalized_at: undefined };
      const result = getConversationStatusWithDate(activeSession);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('active');
    });

    it('should handle session without recording dates', () => {
      const draftSession = { 
        ...mockSession, 
        status: 'draft',
        recording_started_at: undefined,
        recording_ended_at: undefined,
        finalized_at: undefined
      };
      const result = getConversationStatusWithDate(draftSession);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date strings gracefully', () => {
      expect(() => formatConversationDate('invalid-date', 'dashboard')).not.toThrow();
    });

    it('should handle empty session object', () => {
      const emptySession = {
        id: 'empty',
        status: 'draft',
        created_at: new Date().toISOString()
      };
      expect(() => getConversationEndDate(emptySession)).not.toThrow();
      expect(() => getConversationStatusWithDate(emptySession)).not.toThrow();
    });
  });
}); 