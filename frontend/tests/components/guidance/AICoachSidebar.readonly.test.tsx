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
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  describe('when viewing a completed conversation', () => {
    const completedProps = {
      ...defaultProps,
      conversationState: 'completed' as const
    };

    it('should show read-only badge in header', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('Viewing Completed')).toBeInTheDocument();
      expect(screen.getByText('AI Advisor')).toBeInTheDocument();
    });

    it('should show completed message when no messages', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByText('Chat about this completed conversation')).toBeInTheDocument();
      expect(screen.getByText('Ask questions or get insights about what happened')).toBeInTheDocument();
    });

    it('should enable guidance chip buttons for analysis', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      const chipButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Key objective') || 
        btn.textContent?.includes('Discovery questions') ||
        btn.textContent?.includes('Build rapport')
      );
      
      chipButtons.forEach(button => {
        expect(button).not.toBeDisabled();
        expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed');
      });
    });

    it('should show analysis placeholder in input area', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      expect(screen.getByPlaceholderText(/Analyze this completed conversation/)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Ask the AI coach/)).not.toBeInTheDocument();
    });

    it('should allow sending analysis messages', () => {
      render(<AICoachSidebar {...completedProps} />);
      
      const textarea = screen.getByPlaceholderText(/Analyze this completed conversation/);
      fireEvent.change(textarea, { target: { value: 'What was the key objective?' } });
      
      // Find the send button by its styling and content (empty button with icon)
      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).not.toBeDisabled();
      
      fireEvent.click(sendButton);
      
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('What was the key objective?')
      );
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
      
      expect(screen.getByText('Analysis Questions')).toBeInTheDocument();
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
        expect(screen.queryByText('Viewing Completed')).not.toBeInTheDocument();
        
        // Should show input area (different placeholder based on context)
        expect(screen.getByPlaceholderText(/Ask the AI.*anything/)).toBeInTheDocument();
        
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