import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat-guidance/route';

// Mock the necessary dependencies
jest.mock('@/lib/supabase', () => ({
  createAuthenticatedSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/systemSettingsServer', () => ({
  getDefaultAiModelServer: jest.fn().mockResolvedValue('google/gemini-2.5-flash'),
}));

jest.mock('@/lib/chatPromptBuilder', () => ({
  buildChatMessages: jest.fn().mockReturnValue([
    { role: 'user', content: 'What was discussed in the previous meeting?' }
  ]),
}));

jest.mock('@/lib/summarizer', () => ({
  updateRunningSummary: jest.fn().mockResolvedValue(''),
}));

// Mock OpenRouter API
global.fetch = jest.fn();

describe('Chat Guidance API - Linked Conversations Integration', () => {
  const mockSessionId = '1019af3b-04e0-4100-8d9a-518ab9f5f582';
  const mockToken = 'mock-jwt-token';

  // Mock database data from the actual query
  const mockLinkedConversations = [
    {
      session_id: mockSessionId,
      linked_session_id: 'a8f3d2c1-5678-4321-9abc-def012345678',
      title: 'Team Leadership Coaching Session - Q2 Performance Review',
      realtime_summary_cache: {
        tldr: 'The Q2 leadership coaching session focused on common leadership challenges including communication, feedback, accountability, and delegation. Participants shared personal struggles and peer-coached each other, leading to individual goal setting for the next month and a plan for mutual accountability.',
        topics: ['Leadership journey check-in', 'Communication style', 'Giving difficult feedback'],
        decisions: ['Alex\'s goal: Have difficult conversations within 48 hours of identifying an issue.'],
        keyPoints: ['Common leadership challenges identified: communication style, giving difficult feedback, balancing support with accountability'],
        actionItems: ['Alex to prepare a simple framework for difficult conversations']
      },
      status: 'completed',
      created_at: '2025-06-21 12:26:39.139119+00'
    },
    {
      session_id: mockSessionId,
      linked_session_id: '5ff05610-5444-4ac7-b9cb-0bc73a213d9a',
      title: 'AI Feature Strategy Meeting - Q2 2025 Launch Planning',
      realtime_summary_cache: {
        tldr: 'The team is discussing a new AI feature for real-time conversation insights and coaching for sales teams, aiming for a Q2 launch. Key aspects include market opportunity, technical feasibility, core features, privacy, revenue potential, and execution plan.',
        topics: ['AI feature strategy for Q2 launch', 'Market opportunity and competitive analysis'],
        decisions: ['Focus on real-time AI conversation insights and coaching as a key differentiator.'],
        keyPoints: ['Clear market gap for real-time conversation intelligence, with 78% of sales teams wanting in-call coaching.'],
        actionItems: ['Alex to have technical architecture document ready by next Friday.']
      },
      status: 'completed',
      created_at: '2025-06-21 10:44:51.190397+00'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    
    // Mock console.log to capture debug output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should successfully fetch and include linked conversations in AI context', async () => {
    // Mock Supabase client and queries
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // First query: get linked conversation IDs
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [
            { linked_session_id: 'a8f3d2c1-5678-4321-9abc-def012345678' },
            { linked_session_id: '5ff05610-5444-4ac7-b9cb-0bc73a213d9a' }
          ],
          error: null
        })
      })
    });

    // Second query: get session summaries
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        in: jest.fn().mockReturnValueOnce({
          not: jest.fn().mockReturnValueOnce({
            order: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce({
                data: mockLinkedConversations,
                error: null
              })
            })
          })
        })
      })
    });

    const { createAuthenticatedSupabaseClient } = require('@/lib/supabase');
    createAuthenticatedSupabaseClient.mockReturnValue(mockSupabase);

    // Mock OpenRouter API response
    const mockOpenRouterResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              response: "Based on the previous meetings, I can see you discussed leadership coaching and AI feature strategy. The leadership session covered communication challenges and accountability goals, while the AI strategy meeting focused on real-time conversation insights for Q2 launch. What specific aspect would you like to explore for this follow-up meeting?",
              confidence: 95
            })
          }
        }]
      })
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockOpenRouterResponse);

    // Create test request
    const requestBody = {
      message: 'What was discussed in the previous meeting?',
      transcript: '',
      chatHistory: [],
      conversationType: 'team_meeting',
      sessionId: mockSessionId,
      textContext: 'Follow up meeting. We need to finalize this',
      conversationTitle: 'Test meeting 123',
      participantMe: 'You',
      participantThem: 'The other participant'
    };

    const request = new NextRequest('http://localhost:3000/api/chat-guidance', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Execute the API
    const response = await POST(request);
    const responseData = await response.json();

    // Verify database queries were called correctly
    expect(createAuthenticatedSupabaseClient).toHaveBeenCalledWith(mockToken);
    expect(mockSupabase.from).toHaveBeenCalledWith('conversation_links');
    expect(mockSupabase.from).toHaveBeenCalledWith('sessions');

    // Verify OpenRouter was called with context including previous meetings
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-openrouter-key',
        }),
        body: expect.stringContaining('PREVIOUS MEETINGS SUMMARY')
      })
    );

    // Parse the actual body sent to OpenRouter
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody_sent = JSON.parse(fetchCall[1].body);
    const systemPrompt = requestBody_sent.messages.find((m: any) => m.role === 'system')?.content;

    // Verify the system prompt includes previous meeting context
    expect(systemPrompt).toContain('PREVIOUS MEETINGS SUMMARY');
    expect(systemPrompt).toContain('Team Leadership Coaching Session');
    expect(systemPrompt).toContain('AI Feature Strategy Meeting');
    expect(systemPrompt).toContain('leadership challenges including communication, feedback, accountability');
    expect(systemPrompt).toContain('real-time conversation insights and coaching for sales teams');

    // Verify response
    expect(response.status).toBe(200);
    expect(responseData).toHaveProperty('response');
    expect(responseData.response).toContain('leadership coaching');
    expect(responseData.response).toContain('AI feature strategy');

    // Verify console logs
    expect(console.log).toHaveBeenCalledWith('✅ Added 2 previous summaries to context from session cache.');
  });

  test('should handle case when linked conversations have no summaries', async () => {
    // Mock Supabase to return linked conversations but no sessions with summaries
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // First query: get linked conversation IDs
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [{ linked_session_id: 'some-id' }],
          error: null
        })
      })
    });

    // Second query: get session summaries (empty because no summaries)
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        in: jest.fn().mockReturnValueOnce({
          not: jest.fn().mockReturnValueOnce({
            order: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce({
                data: [], // No sessions with summaries
                error: null
              })
            })
          })
        })
      })
    });

    const { createAuthenticatedSupabaseClient } = require('@/lib/supabase');
    createAuthenticatedSupabaseClient.mockReturnValue(mockSupabase);

    // Mock OpenRouter API response
    const mockOpenRouterResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              response: "I don't have access to the content of previous meetings. My knowledge is limited to the current meeting's details.",
              confidence: 80
            })
          }
        }]
      })
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockOpenRouterResponse);

    const requestBody = {
      message: 'What was discussed in the previous meeting?',
      transcript: '',
      chatHistory: [],
      conversationType: 'team_meeting',
      sessionId: mockSessionId,
      textContext: 'Follow up meeting. We need to finalize this',
      conversationTitle: 'Test meeting 123'
    };

    const request = new NextRequest('http://localhost:3000/api/chat-guidance', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Verify that no previous meeting context was added
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody_sent = JSON.parse(fetchCall[1].body);
    const systemPrompt = requestBody_sent.messages.find((m: any) => m.role === 'system')?.content;

    expect(systemPrompt).not.toContain('PREVIOUS MEETINGS SUMMARY');
    expect(responseData.response).toContain("don't have access to the content of previous meetings");
  });

  test('should handle database errors gracefully', async () => {
    // Mock Supabase to return an error
    const mockSupabase = {
      from: jest.fn().mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: null,
            error: new Error('Database connection failed')
          })
        })
      })
    };

    const { createAuthenticatedSupabaseClient } = require('@/lib/supabase');
    createAuthenticatedSupabaseClient.mockReturnValue(mockSupabase);

    // Mock OpenRouter API response
    const mockOpenRouterResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              response: "I'm ready to help with your meeting preparation.",
              confidence: 85
            })
          }
        }]
      })
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockOpenRouterResponse);

    const requestBody = {
      message: 'What was discussed in the previous meeting?',
      transcript: '',
      chatHistory: [],
      conversationType: 'team_meeting',
      sessionId: mockSessionId,
      textContext: 'Follow up meeting. We need to finalize this'
    };

    const request = new NextRequest('http://localhost:3000/api/chat-guidance', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Should still return a response, just without the linked conversation context
    expect(response.status).toBe(200);
    expect(responseData).toHaveProperty('response');
    expect(console.error).toHaveBeenCalledWith('❌ Error fetching linked conversation context:', expect.any(Error));
  });

  test('real-world scenario debug: verify exact flow that is failing', async () => {
    // This test replicates the exact scenario from the logs
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // Mock the exact database results we saw
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [
            { linked_session_id: 'a8f3d2c1-5678-4321-9abc-def012345678' },
            { linked_session_id: '5ff05610-5444-4ac7-b9cb-0bc73a213d9a' }
          ],
          error: null
        })
      })
    });

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        in: jest.fn().mockReturnValueOnce({
          not: jest.fn().mockReturnValueOnce({
            order: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce({
                data: mockLinkedConversations,
                error: null
              })
            })
          })
        })
      })
    });

    const { createAuthenticatedSupabaseClient } = require('@/lib/supabase');
    createAuthenticatedSupabaseClient.mockReturnValue(mockSupabase);

    // Mock the exact OpenRouter response format we're seeing in logs
    const mockOpenRouterResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'gen-1750572760-MWORR9YxuhRxbptGQCce',
        provider: 'Google',
        model: 'google/gemini-2.5-flash',
        object: 'chat.completion',
        created: 1750572760,
        choices: [{
          logprobs: null,
          finish_reason: 'stop',
          native_finish_reason: 'STOP',
          index: 0,
          message: {
            content: "I don't have access to the content of previous meetings. My knowledge is limited to the current meeting's details: \"Test meeting 123\" which is a follow-up meeting to finalize something."
          }
        }],
        usage: { prompt_tokens: 387, completion_tokens: 44, total_tokens: 431 }
      })
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockOpenRouterResponse);

    const requestBody = {
      message: 'What was discussed in the previous meeting?',
      transcript: '',
      chatHistory: [],
      conversationType: 'team_meeting',
      sessionId: mockSessionId,
      textContext: 'Follow up meeting. We need to finalize this',
      conversationTitle: 'Test meeting 123',
      participantMe: 'You',
      participantThem: 'The other participant'
    };

    const request = new NextRequest('http://localhost:3000/api/chat-guidance', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Debug: Print the actual system prompt that was sent
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody_sent = JSON.parse(fetchCall[1].body);
    const systemPrompt = requestBody_sent.messages.find((m: any) => m.role === 'system')?.content;
    
    console.log('=== ACTUAL SYSTEM PROMPT SENT TO AI ===');
    console.log(systemPrompt);
    console.log('=== END SYSTEM PROMPT ===');

    // The AI should have the previous meeting context, but it's saying it doesn't
    // This test will help us understand why
    expect(systemPrompt).toContain('PREVIOUS MEETINGS SUMMARY');
    expect(console.log).toHaveBeenCalledWith('✅ Added 2 previous summaries to context from session cache.');
  });
}); 