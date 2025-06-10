import { saveTranscriptToDatabase, saveTranscriptNow, saveSummaryToDatabase } from '@/lib/sessionService';
import { TranscriptLine } from '@/types/conversation';
import type { Session } from '@supabase/supabase-js';
import { ConversationSummary } from '@/lib/useRealtimeSummary';

describe('sessionService', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const session = { access_token: 'token' } as Session;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('saveTranscriptToDatabase posts new transcript lines', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const lines: TranscriptLine[] = [
      { id: '1', text: 'hello', timestamp: new Date(), speaker: 'ME', confidence: 0.9 },
      { id: '2', text: 'world', timestamp: new Date(), speaker: 'THEM', confidence: 0.8 },
    ];

    const index = await saveTranscriptToDatabase('session1', lines, session, 0);

    expect(mockFetch).toHaveBeenCalledWith('/api/sessions/session1/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: expect.any(String),
    });
    expect(index).toBe(lines.length);
  });

  it('saveTranscriptToDatabase returns last index when no new lines', async () => {
    const lines: TranscriptLine[] = [
      { id: '1', text: 'hi', timestamp: new Date(), speaker: 'ME', confidence: 0.9 },
    ];

    const index = await saveTranscriptToDatabase('s1', lines, session, 1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(index).toBe(1);
  });

  it('saveTranscriptNow skips when data missing', async () => {
    const result = await saveTranscriptNow('', [], null, 3);
    expect(result).toBe(3);
  });

  it('saveSummaryToDatabase sends PATCH request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);
    const summary: ConversationSummary = {
      tldr: 'test',
      keyPoints: [],
      decisions: [],
      actionItems: [],
      nextSteps: [],
      topics: [],
      sentiment: 'positive',
      progressStatus: 'making_progress',
    };

    await saveSummaryToDatabase('abc', summary, session);

    expect(mockFetch).toHaveBeenCalledWith('/api/sessions/abc', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ realtime_summary_cache: summary }),
    });
  });
});
