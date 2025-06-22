import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PreviousMeetingsTab } from '@/components/meeting/conversation/PreviousMeetingsTab';
import { usePreviousMeetings } from '@/lib/meeting/hooks/usePreviousMeetings';
import { LinkedConversation } from '@/lib/meeting/types/previous-meetings.types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}));

// Mock the hook
jest.mock('@/lib/meeting/hooks/usePreviousMeetings');
const mockUsePreviousMeetings = usePreviousMeetings as jest.MockedFunction<typeof usePreviousMeetings>;

// Mock the PreviousMeetingCard component
jest.mock('@/components/meeting/conversation/PreviousMeetingCard', () => ({
  PreviousMeetingCard: ({ conversation, onExpand, onAskQuestion, isExpanded }: any) => (
    <div data-testid={`meeting-card-${conversation.linked_session_id}`}>
      <h3>{conversation.session_title}</h3>
      <button onClick={() => onExpand(conversation.linked_session_id)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      <button onClick={() => onAskQuestion(conversation.linked_session_id, 'test context')}>
        Ask AI
      </button>
    </div>
  )
}));

// Mock the LoadingStates component
jest.mock('@/components/meeting/common/LoadingStates', () => ({
  LoadingStates: ({ type }: { type: string }) => (
    <div data-testid="loading-states">Loading {type}...</div>
  )
}));

describe('PreviousMeetingsTab', () => {
  const mockSessionId = 'test-session-123';
  const mockOnAskAboutMeeting = jest.fn();

  const mockLinkedConversations: LinkedConversation[] = [
    {
      id: 'link-1',
      linked_session_id: 'session-1',
      session_title: 'Team Leadership Coaching Session',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      summary: {
        id: 'summary-1',
        session_id: 'session-1',
        title: 'Leadership Coaching',
        tldr: 'Discussed leadership challenges and accountability',
        key_decisions: ['Implement weekly check-ins', 'Set up mentorship program'],
        action_items: [
          {
            task: 'Schedule team one-on-ones',
            owner: 'Manager',
            due_date: '2024-01-22',
            priority: 'high'
          }
        ],
        follow_up_questions: ['How to measure leadership effectiveness?'],
        conversation_highlights: ['Strong engagement from team', 'Clear action plan established'],
        structured_notes: {
          insights: ['Team needs more structured feedback'],
          recommendations: ['Implement regular coaching sessions']
        },
        generation_status: 'completed',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      }
    },
    {
      id: 'link-2',
      linked_session_id: 'session-2',
      session_title: 'AI Feature Strategy Meeting',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      basic_summary: {
        tldr: 'Discussed AI feature roadmap and technical feasibility'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: [],
      loading: true,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    expect(screen.getByText('Previous Meetings')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-states')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const mockRefetch = jest.fn();
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: [],
      loading: false,
      error: 'Failed to load meetings',
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: mockRefetch
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    expect(screen.getByText('Failed to Load Previous Meetings')).toBeInTheDocument();
    expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no linked conversations', () => {
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: [],
      loading: false,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    expect(screen.getByText('No Previous Meetings Linked')).toBeInTheDocument();
    expect(screen.getByText(/This meeting doesn't have any linked previous meetings/)).toBeInTheDocument();
    expect(screen.getByText(/Linked meetings help the AI advisor/)).toBeInTheDocument();
  });

  it('renders linked conversations correctly', () => {
    const mockToggleExpanded = jest.fn();
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: mockLinkedConversations,
      loading: false,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: mockToggleExpanded,
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    // Check header shows count
    expect(screen.getByText('2')).toBeInTheDocument(); // Badge count

    // Check both meetings are rendered
    expect(screen.getByTestId('meeting-card-session-1')).toBeInTheDocument();
    expect(screen.getByTestId('meeting-card-session-2')).toBeInTheDocument();
    
    // Check meeting titles
    expect(screen.getByText('Team Leadership Coaching Session')).toBeInTheDocument();
    expect(screen.getByText('AI Feature Strategy Meeting')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('1 with rich summaries')).toBeInTheDocument();
    expect(screen.getByText('2 from last 7 days')).toBeInTheDocument();
  });

  it('handles expand/collapse correctly', () => {
    const mockToggleExpanded = jest.fn();
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: mockLinkedConversations,
      loading: false,
      error: null,
      expandedCards: new Set(['session-1']),
      toggleExpanded: mockToggleExpanded,
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    const expandButton = screen.getAllByText('Collapse')[0];
    fireEvent.click(expandButton);
    expect(mockToggleExpanded).toHaveBeenCalledWith('session-1');
  });

  it('handles ask AI correctly', async () => {
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: mockLinkedConversations,
      loading: false,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    const askButtons = screen.getAllByText('Ask AI');
    fireEvent.click(askButtons[0]);

    await waitFor(() => {
      expect(mockOnAskAboutMeeting).toHaveBeenCalledWith('session-1', 'test context');
    });
  });

  it('handles refresh correctly', () => {
    const mockRefetch = jest.fn();
    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: mockLinkedConversations,
      loading: false,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: mockRefetch
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('calculates stats correctly', () => {
    // Test with different dates to verify stats calculation
    const conversationsWithDifferentDates: LinkedConversation[] = [
      {
        ...mockLinkedConversations[0],
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        ...mockLinkedConversations[1],
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      }
    ];

    mockUsePreviousMeetings.mockReturnValue({
      linkedConversations: conversationsWithDifferentDates,
      loading: false,
      error: null,
      expandedCards: new Set(),
      toggleExpanded: jest.fn(),
      askAboutMeeting: jest.fn(),
      refetch: jest.fn()
    });

    render(
      <PreviousMeetingsTab 
        sessionId={mockSessionId}
        onAskAboutMeeting={mockOnAskAboutMeeting}
      />
    );

    expect(screen.getByText('1 with rich summaries')).toBeInTheDocument();
    expect(screen.getByText('1 from last 7 days')).toBeInTheDocument();
  });
}); 