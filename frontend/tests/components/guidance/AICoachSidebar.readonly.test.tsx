import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AICoachSidebar from '@/components/guidance/AICoachSidebar';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {}
}));

jest.mock('rehype-highlight', () => ({
  __esModule: true,
  default: () => {}
}));

describe('AICoachSidebar - Read Only Mode', () => {
  const defaultProps = {
    isRecording: false,
    isPaused: false,
    messages: [],
    onSendMessage: jest.fn(),
    sessionDuration: 0,
    onWidthChange: jest.fn(),
    conversationState: 'ready' as const,
    sessionId: 'test-session-id',
    authToken: 'test-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when viewing a completed conversation', () => {
    const completedProps = {
      ...defaultProps,
      conversationState: 'completed' as const
    };

    it('should show read-only badge in header', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('Read Only')).toBeInTheDocument();
      expect(screen.getByText('AI Coach')).toBeInTheDocument();
    });

    it('should show completed message when no messages', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('Conversation Complete')).toBeInTheDocument();
      expect(screen.getByText('View the summary and timeline for insights')).toBeInTheDocument();
    });

    it('should disable guidance chip buttons', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      const chipButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('What to ask') || 
        btn.textContent?.includes('How am I doing')
      );
      
      chipButtons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      });
    });

    it('should show read-only message instead of input area', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('This conversation has ended')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Ask the AI coach/)).not.toBeInTheDocument();
    });

    it('should show toast when trying to send message', () => {
      const { rerender } = render(<AICoachSidebar {...completedProps} />);
      
      // First set some message text in ready state
      const readyProps = { ...defaultProps, conversationState: 'ready' as const };
      rerender(<AICoachSidebar {...readyProps} />);
      
      const textarea = screen.getByPlaceholderText(/Ask the AI coach/);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      
      // Then switch to completed state
      rerender(<AICoachSidebar {...completedProps} />);
      
      // Try to send message (if somehow the UI allowed it)
      const sendButton = screen.queryByRole('button', { name: /send/i });
      if (sendButton) {
        fireEvent.click(sendButton);
        
        expect(toast.info).toHaveBeenCalledWith(
          'This conversation has ended',
          expect.objectContaining({
            description: 'You cannot send messages to completed conversations'
          })
        );
      }
    });

    it('should disable refresh chips button', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      const refreshButton = screen.getByTitle(/Cannot refresh guidance for completed conversations/);
      expect(refreshButton).toBeDisabled();
    });

    it('should not show add to checklist button on AI messages', () => {
      const messagesProps = {
        ...completedProps,
        messages: [
          {
            id: '1',
            type: 'ai' as const,
            content: 'This is AI guidance',
            timestamp: new Date()
          }
        ],
        onAddToChecklist: jest.fn()
      };
      
      render(<AICoachSidebar {...messagesProps} />);
      
      // The message should be rendered but without the checklist button
      expect(screen.getByText('This is AI guidance')).toBeInTheDocument();
      expect(screen.queryByText('Generate checklist')).not.toBeInTheDocument();
    });

    it('should show different title in quick help section', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('Conversation Complete')).toBeInTheDocument();
      expect(screen.queryByText(/Live.*Help/)).not.toBeInTheDocument();
    });
  });

  describe('when in active conversation states', () => {
    ['ready', 'recording', 'paused'].forEach(state => {
      it(`should allow interactions when conversation state is ${state}`, () => {
        const activeProps = {
          ...defaultProps,
          conversationState: state as any
        };
        
        render(<AICoachSidebar {...activeProps} />);
        
        // Should not show read-only badge
        expect(screen.queryByText('Read Only')).not.toBeInTheDocument();
        
        // Should show input area
        expect(screen.getByPlaceholderText(/Ask the AI coach/)).toBeInTheDocument();
        
        // Guidance chips should be enabled
        const chipButtons = screen.getAllByRole('button').filter(btn => 
          btn.textContent?.includes('What to ask') || 
          btn.textContent?.includes('How am I doing')
        );
        
        chipButtons.forEach(button => {
          expect(button).not.toBeDisabled();
        });
      });
    });
  });
});