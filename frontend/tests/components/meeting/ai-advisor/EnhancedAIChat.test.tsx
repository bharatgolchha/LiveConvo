import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedAIChat } from '@/components/meeting/ai-advisor/EnhancedAIChat';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useChatGuidance } from '@/lib/meeting/hooks/useChatGuidance';

// Mock the hooks
jest.mock('@/lib/meeting/context/MeetingContext');
jest.mock('@/lib/meeting/hooks/useChatGuidance');

// Mock fetch
global.fetch = jest.fn();

const mockUseMeetingContext = useMeetingContext as jest.MockedFunction<typeof useMeetingContext>;
const mockUseChatGuidance = useChatGuidance as jest.MockedFunction<typeof useChatGuidance>;

describe('EnhancedAIChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseMeetingContext.mockReturnValue({
      meeting: { id: 'test-meeting', type: 'sales' },
      transcript: [
        { id: '1', speaker: 'ME', text: 'Hello', timestamp: '2024-01-01T10:00:00Z', displayName: 'John' },
        { id: '2', speaker: 'THEM', text: 'Hi there', timestamp: '2024-01-01T10:01:00Z', displayName: 'Jane' }
      ]
    } as any);

    mockUseChatGuidance.mockReturnValue({
      sendMessage: jest.fn(),
      loading: false,
      error: null
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI response here' })
    });
  });

  it('renders welcome message on first load', () => {
    render(<EnhancedAIChat />);
    
    expect(screen.getByText(/Hi! I'm your AI meeting advisor/)).toBeInTheDocument();
  });

  it('shows transcript context in placeholder', () => {
    render(<EnhancedAIChat />);
    
    expect(screen.getByText('2 transcript lines available')).toBeInTheDocument();
  });

  it('allows typing and submitting messages', async () => {
    render(<EnhancedAIChat />);
    
    const input = screen.getByPlaceholderText('Ask AI anything about the meeting...');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/chat-guidance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('Test question')
    });
  });

  it('shows character count warning', () => {
    render(<EnhancedAIChat />);
    
    const input = screen.getByPlaceholderText('Ask AI anything about the meeting...');
    fireEvent.change(input, { target: { value: 'a'.repeat(450) } });
    
    expect(screen.getByText('450/500')).toHaveClass('text-destructive');
  });

  it('disables input while loading', () => {
    mockUseChatGuidance.mockReturnValue({
      sendMessage: jest.fn(),
      loading: true,
      error: null
    });
    
    render(<EnhancedAIChat />);
    
    const input = screen.getByPlaceholderText('Ask AI anything about the meeting...');
    expect(input).toBeDisabled();
  });

  it('formats timestamps correctly', () => {
    render(<EnhancedAIChat />);
    
    // Welcome message should have a timestamp
    const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('shows error message on API failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<EnhancedAIChat />);
    
    const input = screen.getByPlaceholderText('Ask AI anything about the meeting...');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
    });
  });

  it('clears input after successful submission', async () => {
    render(<EnhancedAIChat />);
    
    const input = screen.getByPlaceholderText('Ask AI anything about the meeting...') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
}); 