import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationInboxItem from '@/components/dashboard/ConversationInboxItem';
import { Session } from '@/lib/hooks/useSessions';

const mockSession: Session = {
  id: 'session-1',
  title: 'Demo Call',
  status: 'completed',
  conversation_type: 'sales',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ConversationInboxItem – Follow-up button', () => {
  it('calls onCreateFollowUp when Follow-Up button clicked', () => {
    const handleFollowUp = jest.fn();

    render(
      <ConversationInboxItem
        session={mockSession}
        onResume={jest.fn()}
        onViewSummary={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
        onCreateFollowUp={handleFollowUp}
      />
    );

    const btn = screen.getByRole('button', { name: /follow-up/i });
    fireEvent.click(btn);

    expect(handleFollowUp).toHaveBeenCalledTimes(1);
    expect(handleFollowUp).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-1' }));
  });
}); 