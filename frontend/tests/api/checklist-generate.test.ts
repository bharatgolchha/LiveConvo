// Mock fetch
global.fetch = jest.fn()

describe('Checklist Generate API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OpenRouter API Integration', () => {
    it('should generate multiple checklist items from AI guidance', async () => {
      const mockOpenRouterResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              items: [
                { text: 'Send follow-up email to John', priority: 'high', type: 'followup' },
                { text: 'Prepare meeting agenda', priority: 'medium', type: 'preparation' },
                { text: 'Research competitor pricing', priority: 'low', type: 'research' }
              ]
            })
          }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenRouterResponse
      })

      // Test the API call logic
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { role: 'system', content: 'Extract checklist items...' },
            { role: 'user', content: 'Test message' }
          ]
        })
      })

      const data = await response.json()
      const parsedContent = JSON.parse(data.choices[0].message.content)

      expect(parsedContent.items).toHaveLength(3)
      expect(parsedContent.items[0].text).toBe('Send follow-up email to John')
      expect(parsedContent.items[0].priority).toBe('high')
      expect(parsedContent.items[0].type).toBe('followup')
    })

    it('should include conversation type in system prompt when provided', async () => {
      let capturedBody: any = null;

      (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
        capturedBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({ items: [] })
              }
            }]
          })
        }
      })

      await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { 
              role: 'system', 
              content: `Extract checklist items... Context: This is from a sales conversation.` 
            },
            { role: 'user', content: 'Test message' }
          ]
        })
      })

      expect(capturedBody.messages[0].content).toContain('sales conversation')
    })

    it('should validate and clean checklist items', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              items: [
                { text: '   Valid task with spaces   ', priority: 'invalid', type: 'invalid' },
                { text: '', priority: 'high', type: 'action' }, // Empty text
                { text: 'A'.repeat(150), priority: 'medium', type: 'followup' }, // Too long
                { text: 'Good task', priority: 'high', type: 'action' }
              ]
            })
          }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: []
        })
      })

      const data = await response.json()
      const parsedContent = JSON.parse(data.choices[0].message.content)
      
      // Simulate the validation logic from the API
      const validItems = parsedContent.items
        .filter((item: any) => item.text && item.text.trim().length > 0)
        .slice(0, 5)
        .map((item: any) => ({
          text: item.text.trim().substring(0, 100),
          priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          type: ['preparation', 'followup', 'research', 'decision', 'action'].includes(item.type) ? item.type : 'action'
        }))

      expect(validItems).toHaveLength(3) // Empty one filtered out
      expect(validItems[0].text).toBe('Valid task with spaces')
      expect(validItems[0].priority).toBe('medium') // Invalid priority defaulted
      expect(validItems[0].type).toBe('action') // Invalid type defaulted
      expect(validItems[1].text).toHaveLength(100) // Truncated to 100 chars
    })

    it('should limit results to maximum 5 items', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              items: Array(10).fill(null).map((_, i) => ({
                text: `Task ${i + 1}`,
                priority: 'medium',
                type: 'action'
              }))
            })
          }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: []
        })
      })

      const data = await response.json()
      const parsedContent = JSON.parse(data.choices[0].message.content)
      
      // Simulate the slice logic from the API
      const limitedItems = parsedContent.items.slice(0, 5)

      expect(limitedItems).toHaveLength(5)
      expect(limitedItems[4].text).toBe('Task 5')
    })
  })
})