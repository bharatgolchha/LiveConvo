/**
 * Unit tests for transcript API endpoints
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/sessions/[id]/transcript/route';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              single: jest.fn(),
              order: jest.fn(() => ({
                // For transcripts query
              })),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
    })),
  },
}));

describe('/api/sessions/[id]/transcript', () => {
  const mockSessionId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET method', () => {
    it('should return transcript data for authenticated user', async () => {
      // Mock successful auth
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock session verification
      const mockSessionQuery = {
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: mockSessionId, user_id: mockUserId },
                error: null,
              }),
            })),
          })),
        })),
      };
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return { select: jest.fn(() => mockSessionQuery) };
        }
        if (table === 'transcripts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      content: 'Hello world',
                      speaker: 'user',
                      start_time_seconds: 0,
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const request = new NextRequest('http://localhost:3000/api/sessions/123/transcript', {
        headers: { authorization: 'Bearer token123' },
      });

      const response = await GET(request, { 
        params: Promise.resolve({ id: mockSessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].content).toBe('Hello world');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      });

      const request = new NextRequest('http://localhost:3000/api/sessions/123/transcript');

      const response = await GET(request, { 
        params: Promise.resolve({ id: mockSessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST method', () => {
    it('should save transcript lines for a session', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockInsertQuery = {
        select: jest.fn().mockResolvedValue({
          data: [{ id: '1', content: 'Test transcript' }],
          error: null,
        }),
      };
      
      supabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsertQuery),
      });

      const transcriptData = [
        {
          session_id: mockSessionId,
          content: 'Test transcript',
          speaker: 'user',
          start_time_seconds: 0,
          is_final: true,
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/sessions/123/transcript', {
        method: 'POST',
        body: JSON.stringify(transcriptData),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: mockSessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toHaveLength(1);
    });

    it('should return 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions/123/transcript', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: mockSessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });
  });
}); 