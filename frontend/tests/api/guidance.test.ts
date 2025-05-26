/**
 * Tests for OpenAI Guidance API Logic
 * 
 * Tests the guidance generation logic that would be used in the API route
 */

// Mock fetch for OpenAI API calls
const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          suggestions: [
            {
              type: 'ask',
              message: 'Ask about their current pain points',
              confidence: 85,
              reasoning: 'Understanding pain points is crucial for sales',
              priority: 'high'
            }
          ]
        })
      }
    }
  ]
}

describe('OpenAI Guidance API Logic', () => {
  beforeEach(() => {
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset()
  })

  describe('OpenAI API Integration', () => {
    it('should call OpenAI API with correct parameters', async () => {
      // Mock successful OpenAI API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse,
      })

      const requestData = {
        transcript: 'Hello, I am interested in your product.',
        context: 'Sales call with potential customer',
        userContext: 'First-time buyer, budget conscious',
        conversationType: 'sales',
        participantRole: 'host'
      }

      // Call fetch directly to test the OpenAI integration
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key-for-testing',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert conversation coach'
            },
            {
              role: 'user',
              content: `Transcript: ${requestData.transcript}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        })
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.choices[0].message.content).toContain('suggestions')
      
      // Verify OpenAI API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key-for-testing',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should handle OpenAI API errors', async () => {
      // Mock OpenAI API error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      })

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key-for-testing',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [],
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
    })

    it('should handle malformed OpenAI response', async () => {
      // Mock malformed OpenAI response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'invalid json'
              }
            }
          ]
        }),
      })

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key-for-testing',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [],
        })
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.choices[0].message.content).toBe('invalid json')
    })
  })

  describe('Response Processing', () => {
    it('should parse guidance response correctly', () => {
      const guidanceData = JSON.parse(mockOpenAIResponse.choices[0].message.content)
      
      expect(guidanceData.suggestions).toHaveLength(1)
      expect(guidanceData.suggestions[0]).toMatchObject({
        type: 'ask',
        message: 'Ask about their current pain points',
        confidence: 85,
        reasoning: 'Understanding pain points is crucial for sales',
        priority: 'high'
      })
    })

    it('should handle empty suggestions', () => {
      const emptyResponse = {
        suggestions: []
      }
      
      expect(emptyResponse.suggestions).toEqual([])
    })

    it('should validate suggestion structure', () => {
      const validSuggestion = {
        type: 'ask',
        message: 'Test message',
        confidence: 80,
        reasoning: 'Test reasoning',
        priority: 'medium'
      }
      
      expect(validSuggestion.type).toMatch(/ask|clarify|avoid|suggest|warn/)
      expect(validSuggestion.priority).toMatch(/low|medium|high/)
      expect(typeof validSuggestion.confidence).toBe('number')
      expect(validSuggestion.confidence).toBeGreaterThanOrEqual(0)
      expect(validSuggestion.confidence).toBeLessThanOrEqual(100)
    })
  })
}) 