import { renderHook, act } from '@testing-library/react';
import { useChatGuidance } from '@/lib/useChatGuidance';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useChatGuidance', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should mark new AI messages as unread by default', () => {
    const { result } = renderHook(() => 
      useChatGuidance({
        transcript: 'test transcript',
        conversationType: 'sales'
      })
    );

    act(() => {
      result.current.addAutoGuidance({
        type: 'suggest',
        message: 'Test guidance message',
        confidence: 85
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].read).toBe(false);
    expect(result.current.messages[0].type).toBe('auto-guidance');
  });

  it('should mark user messages as read by default', async () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI response',
        suggestedActions: [],
        confidence: 90,
        generatedAt: new Date().toISOString()
      })
    });

    const { result } = renderHook(() => 
      useChatGuidance({
        transcript: 'test transcript',
        conversationType: 'sales'
      })
    );

    await act(async () => {
      await result.current.sendMessage('Test user message');
    });

    const userMessage = result.current.messages.find(msg => msg.type === 'user');
    const aiMessage = result.current.messages.find(msg => msg.type === 'ai');

    expect(userMessage?.read).toBe(true);
    expect(aiMessage?.read).toBe(false);
  });

  it('should mark all messages as read when markMessagesAsRead is called', () => {
    const { result } = renderHook(() => 
      useChatGuidance({
        transcript: 'test transcript',
        conversationType: 'sales'
      })
    );

    // Add multiple unread messages
    act(() => {
      result.current.addAutoGuidance({
        type: 'suggest',
        message: 'First guidance',
        confidence: 85
      });
      result.current.addAutoGuidance({
        type: 'clarify',
        message: 'Second guidance',
        confidence: 90
      });
    });

    // Verify messages are unread
    expect(result.current.messages.every(msg => msg.read === false)).toBe(true);

    // Mark all as read
    act(() => {
      result.current.markMessagesAsRead();
    });

    // Verify all messages are now read
    expect(result.current.messages.every(msg => msg.read === true)).toBe(true);
  });

  it('should handle system messages correctly', () => {
    const { result } = renderHook(() =>
      useChatGuidance({
        transcript: 'test transcript',
        conversationType: 'sales'
      })
    );

    act(() => {
      result.current.initializeChat();
    });

    const systemMessage = result.current.messages.find(msg => msg.type === 'system');
    expect(systemMessage?.read).toBe(false);
    expect(systemMessage?.content).toContain('AI conversation coach');
  });

  it('should include textContext and conversationTitle in API request', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'ok',
        suggestedActions: [],
        confidence: 90,
        generatedAt: new Date().toISOString()
      })
    });

    const { result } = renderHook(() =>
      useChatGuidance({
        transcript: 'hello',
        conversationType: 'sales',
        textContext: 'background',
        conversationTitle: 'Demo',
        sessionId: '123'
      })
    );

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(fetch).toHaveBeenCalledWith('/api/chat-guidance', expect.objectContaining({
      method: 'POST',
      headers: expect.any(Object),
      body: JSON.stringify({
        message: 'Hi',
        transcript: 'hello',
        chatHistory: expect.any(Array),
        conversationType: 'sales',
        sessionId: '123',
        textContext: 'background',
        conversationTitle: 'Demo'
      })
    }));
  });
});
