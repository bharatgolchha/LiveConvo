import React from 'react';
import { render } from '@testing-library/react';
import ConversationInboxItem from '@/components/dashboard/ConversationInboxItem';
import type { Session } from '@/lib/hooks/useSessions';

/**
 * Helper to create a minimal session object for tests.
 */
const baseSession: Session = {
  id: 'session-1',
  title: 'Test Session',
  status: 'completed',
  conversation_type: 'sales',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ConversationInboxItem', () => {
  it('renders without crashing when conversation_type is null', () => {
    const session = {
      ...baseSession,
      // Force conversation_type to be null to simulate edge case
      conversation_type: null as unknown as string,
    };

    const { getByText } = render(
      <ConversationInboxItem
        session={session}
        onResume={jest.fn()}
        onViewSummary={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
        onCreateFollowUp={jest.fn()}
      />
    );

    // Should display the default icon 💬
    expect(getByText('💬')).toBeInTheDocument();
  });

  it('shows correct icon for known conversation_type', () => {
    const session = {
      ...baseSession,
      conversation_type: 'sales',
    };

    const { getByText } = render(
      <ConversationInboxItem
        session={session}
        onResume={jest.fn()}
        onViewSummary={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
        onCreateFollowUp={jest.fn()}
      />
    );

    expect(getByText('💼')).toBeInTheDocument();
  });
}); 