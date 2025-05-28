import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingChatGuidance } from '@/components/guidance/FloatingChatGuidance';
import { ChatMessage } from '@/lib/useChatGuidance';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the ChatGuidance component
jest.mock('@/components/guidance/ChatGuidance', () => ({
  ChatGuidance: () => <div data-testid="chat-guidance">Chat Guidance Component</div>
}));

describe('FloatingChatGuidance', () => {
  const mockProps = {
    isLoading: false,
    inputValue: '',
    setInputValue: jest.fn(),
    sendMessage: jest.fn(),
    sendQuickAction: jest.fn(),
    messagesEndRef: { current: null },
    isRecording: true,
    markMessagesAsRead: jest.fn(),
  };

  const createMessage = (
    type: 'user' | 'ai' | 'system' | 'auto-guidance',
    read: boolean = false,
    isResponse: boolean = false
  ): ChatMessage => ({
    id: `msg_${Math.random()}`,
    type,
    content: `Test ${type} message`,
    timestamp: new Date(),
    read,
    metadata: type === 'ai' ? { isResponse } : undefined,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate unread count correctly for auto-guidance messages', () => {
    const messages = [
      createMessage('auto-guidance', false), // Should count
      createMessage('auto-guidance', true),  // Should not count (read)
      createMessage('user', false),          // Should not count (wrong type)
      createMessage('ai', false, true),      // Should count (AI response)
      createMessage('ai', false, false),     // Should not count (not a response)
    ];

    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={messages}
      />
    );

    // Check if the unread badge shows count of 2
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('should not show unread badge when all messages are read', () => {
    const messages = [
      createMessage('auto-guidance', true),
      createMessage('ai', true, true),
    ];

    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={messages}
      />
    );

    // Badge should not be present
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('should show "9+" when unread count exceeds 9', () => {
    const messages = Array.from({ length: 12 }, () => createMessage('auto-guidance', false));

    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={messages}
      />
    );

    const badge = screen.getByText('9+');
    expect(badge).toBeInTheDocument();
  });

  it('should call markMessagesAsRead when drawer is opened', () => {
    const messages = [createMessage('auto-guidance', false)];

    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={messages}
      />
    );

    // Click the floating button to open drawer
    const floatingButton = screen.getByRole('button');
    fireEvent.click(floatingButton);

    expect(mockProps.markMessagesAsRead).toHaveBeenCalledTimes(1);
  });

  it('should not show floating button when not recording', () => {
    render(
      <FloatingChatGuidance
        {...mockProps}
        isRecording={false}
        messages={[]}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should handle empty messages array', () => {
    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={[]}
      />
    );

    // Should not show unread badge when no messages
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('should only count unread messages of correct types', () => {
    const messages = [
      createMessage('system', false),        // Should not count
      createMessage('user', false),          // Should not count
      createMessage('auto-guidance', false), // Should count
      createMessage('ai', false, false),     // Should not count (not a response)
      createMessage('ai', false, true),      // Should count
    ];

    render(
      <FloatingChatGuidance
        {...mockProps}
        messages={messages}
      />
    );

    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });
}); 