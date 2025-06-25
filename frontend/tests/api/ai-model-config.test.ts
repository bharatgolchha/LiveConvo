import { NextRequest } from 'next/server';
import { POST as guidancePost } from '@/app/api/guidance/route';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }
}));

jest.mock('@/lib/aiModelConfig', () => ({
  ...jest.requireActual('@/lib/aiModelConfig'),
  getAIModelForAction: jest.fn()
}));

jest.mock('@/lib/utils', () => ({
  getCurrentDateContext: jest.fn().mockReturnValue('Today is January 25, 2025.')
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AI Model Configuration in API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('should use action-specific model in guidance endpoint', async () => {
    const mockGetAIModelForAction = getAIModelForAction as jest.MockedFunction<typeof getAIModelForAction>;
    mockGetAIModelForAction.mockResolvedValue('google/gemini-pro');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              suggestions: [
                { text: 'Test suggestion', reasoning: 'Test' }
              ]
            })
          }
        }]
      })
    });

    const request = {
      json: async () => ({
        transcript: 'Test transcript',
        conversationType: 'meeting'
      })
    } as unknown as NextRequest;

    await guidancePost(request);

    expect(mockGetAIModelForAction).toHaveBeenCalledWith(AIAction.GUIDANCE);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"model":"google/gemini-pro"')
      })
    );
  });
});