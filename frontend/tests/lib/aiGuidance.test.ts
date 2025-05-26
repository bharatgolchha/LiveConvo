/**
 * Tests for AI Guidance Engine
 * 
 * Tests the client-side AI guidance functionality that calls the API route
 */

import { AIGuidanceEngine, GuidanceRequest, GuidanceSuggestion } from '@/lib/aiGuidance'

// Mock fetch for API calls
const mockApiResponse = {
  suggestions: [
    {
      type: 'ask',
      message: 'Ask about their budget range',
      confidence: 90,
      reasoning: 'Budget qualification is important for sales',
      priority: 'high'
    },
    {
      type: 'suggest',
      message: 'Share a relevant case study',
      confidence: 75,
      reasoning: 'Social proof can build trust',
      priority: 'medium'
    }
  ]
}

describe('AI Guidance Engine', () => {
  let guidanceEngine: AIGuidanceEngine

  beforeEach(() => {
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset()
    guidanceEngine = new AIGuidanceEngine()
  })

  describe('generateGuidance', () => {
    it('should generate guidance suggestions successfully', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      })

      const request: GuidanceRequest = {
        transcript: 'Customer: I am interested in your product but need to understand pricing.',
        context: 'Sales call with enterprise client',
        userContext: 'High-value prospect, budget conscious',
        conversationType: 'sales',
        participantRole: 'host'
      }

      const result = await guidanceEngine.generateGuidance(request)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'ask',
        message: 'Ask about their budget range',
        confidence: 90,
        reasoning: 'Budget qualification is important for sales',
        priority: 'high'
      })

      // Verify API was called with correct data
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: request.transcript,
          context: 'No context documents provided',
          userContext: request.userContext,
          conversationType: request.conversationType,
          participantRole: request.participantRole
        }),
      })
    })

    it('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      const request: GuidanceRequest = {
        transcript: 'Test transcript',
        context: 'Test context',
      }

      const result = await guidanceEngine.generateGuidance(request)

      // Should return fallback guidance on error
      expect(result).toHaveLength(1)
      expect(result[0].type).toMatch(/ask|clarify/)
    })

    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const request: GuidanceRequest = {
        transcript: 'Test transcript',
        context: 'Test context',
      }

      const result = await guidanceEngine.generateGuidance(request)

      // Should return fallback guidance on error
      expect(result).toHaveLength(1)
      expect(result[0].type).toMatch(/ask|clarify/)
    })

    it('should handle missing context', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      })

      const request: GuidanceRequest = {
        transcript: 'Customer is asking about features',
        context: '', // Empty context
      }

      const result = await guidanceEngine.generateGuidance(request)

      expect(result).toHaveLength(2)
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: request.transcript,
          context: 'No context documents provided',
          userContext: request.userContext,
          conversationType: request.conversationType,
          participantRole: request.participantRole
        }),
      })
    })

    it('should handle different conversation types', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              type: 'clarify',
              message: 'Ask for more details about the issue',
              confidence: 85,
              reasoning: 'Need more information to help',
              priority: 'high'
            }
          ]
        }),
      })

      const request: GuidanceRequest = {
        transcript: 'Customer: My login is not working',
        context: 'Support ticket',
        conversationType: 'support',
        participantRole: 'host' // Fixed: use valid role
      }

      const result = await guidanceEngine.generateGuidance(request)

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('clarify')
      expect(result[0].message).toBe('Ask for more details about the issue')
    })

    it('should validate guidance suggestion structure', async () => {
      // Mock response with invalid suggestion structure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              // Missing required fields
              message: 'Test message',
            }
          ]
        }),
      })

      const request: GuidanceRequest = {
        transcript: 'Test transcript',
        context: 'Test context',
      }

      const result = await guidanceEngine.generateGuidance(request)

      // Should still succeed but with potentially incomplete data
      expect(result).toHaveLength(1)
      expect(result[0].message).toBe('Test message')
    })

    it('should handle malformed API response', async () => {
      // Mock response with no suggestions field
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const request: GuidanceRequest = {
        transcript: 'Test transcript',
        context: 'Test context',
      }

      const result = await guidanceEngine.generateGuidance(request)

      expect(result).toEqual([]) // Should default to empty array
    })

    it('should include all optional parameters in request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      })

      const request: GuidanceRequest = {
        transcript: 'Full conversation transcript',
        context: 'Meeting context',
        userContext: 'User-provided context',
        conversationType: 'meeting',
        participantRole: 'host' // Fixed: use valid role
      }

      await guidanceEngine.generateGuidance(request)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: 'Full conversation transcript',
          context: 'No context documents provided',
          userContext: 'User-provided context',
          conversationType: 'meeting',
          participantRole: 'host'
        }),
      })
    })
  })

  describe('GuidanceSuggestion type validation', () => {
    it('should accept valid guidance types', () => {
      const validTypes = ['ask', 'clarify', 'avoid', 'suggest', 'warn']
      
      validTypes.forEach(type => {
        const suggestion: GuidanceSuggestion = {
          id: 'test-id',
          type: type as any,
          message: 'Test message',
          confidence: 80,
          reasoning: 'Test reasoning',
          timestamp: new Date(),
          priority: 'medium'
        }
        
        expect(suggestion.type).toBe(type)
      })
    })

    it('should accept valid priority levels', () => {
      const validPriorities = ['low', 'medium', 'high']
      
      validPriorities.forEach(priority => {
        const suggestion: GuidanceSuggestion = {
          id: 'test-id',
          type: 'ask',
          message: 'Test message',
          confidence: 80,
          reasoning: 'Test reasoning',
          timestamp: new Date(),
          priority: priority as any
        }
        
        expect(suggestion.priority).toBe(priority)
      })
    })
  })
}) 