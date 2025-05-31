import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChecklistRecommendations } from '@/components/conversation/ChecklistRecommendations';
import { SuggestedChecklistItem } from '@/lib/useRealtimeSummary';

const mockSuggestions: SuggestedChecklistItem[] = [
  {
    text: 'Schedule follow-up meeting',
    priority: 'high',
    type: 'followup',
    relevance: 95
  },
  {
    text: 'Research competitor pricing',
    priority: 'medium',
    type: 'research',
    relevance: 80
  }
];

describe('ChecklistRecommendations', () => {
  it('renders suggestions correctly', () => {
    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={jest.fn()}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    expect(screen.getByText('AI Checklist Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Schedule follow-up meeting')).toBeInTheDocument();
    expect(screen.getByText('Research competitor pricing')).toBeInTheDocument();
  });

  it('handles add item action', async () => {
    const mockOnAddItem = jest.fn().mockResolvedValue(undefined);
    const mockOnDismiss = jest.fn();

    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={mockOnAddItem}
        onDismiss={mockOnDismiss}
        sessionId="test-session"
      />
    );

    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(mockOnAddItem).toHaveBeenCalledWith('Schedule follow-up meeting');
    });
  });

  it('handles dismiss action', async () => {
    const mockOnAddItem = jest.fn();
    const mockOnDismiss = jest.fn();

    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={mockOnAddItem}
        onDismiss={mockOnDismiss}
        sessionId="test-session"
      />
    );

    const dismissButtons = screen.getAllByRole('button', { name: '' });
    // Find the X button (second button in each row)
    const xButtons = dismissButtons.filter(button => button.querySelector('.lucide-x'));
    fireEvent.click(xButtons[0]);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith(0);
    }, { timeout: 1000 });
  });

  it('displays priority and type badges', () => {
    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={jest.fn()}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    expect(screen.getByText('followup')).toBeInTheDocument();
    expect(screen.getByText('research')).toBeInTheDocument();
    expect(screen.getByText('Priority: high')).toBeInTheDocument();
    expect(screen.getByText('Priority: medium')).toBeInTheDocument();
  });

  it('displays relevance scores', () => {
    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={jest.fn()}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    expect(screen.getByText('Relevance: 95%')).toBeInTheDocument();
    expect(screen.getByText('Relevance: 80%')).toBeInTheDocument();
  });

  it('renders nothing when no suggestions provided', () => {
    const { container } = render(
      <ChecklistRecommendations
        suggestions={[]}
        onAddItem={jest.fn()}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows loading state when adding item', async () => {
    const mockOnAddItem = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ChecklistRecommendations
        suggestions={mockSuggestions}
        onAddItem={mockOnAddItem}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);

    // Should show spinner
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const spinnerButton = buttons.find(button => button.querySelector('.animate-spin'));
      expect(spinnerButton).toBeInTheDocument();
      expect(spinnerButton?.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('shows bulk action button for multiple suggestions', () => {
    const threeSuggestions = [
      ...mockSuggestions,
      {
        text: 'Review meeting notes',
        priority: 'high' as const,
        type: 'action' as const,
        relevance: 90
      }
    ];

    render(
      <ChecklistRecommendations
        suggestions={threeSuggestions}
        onAddItem={jest.fn()}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    expect(screen.getByText('Add All High Priority')).toBeInTheDocument();
  });

  it('handles bulk add action for high priority items', async () => {
    const mockOnAddItem = jest.fn().mockResolvedValue(undefined);
    const threeSuggestions: SuggestedChecklistItem[] = [
      ...mockSuggestions,
      {
        text: 'Review meeting notes',
        priority: 'high',
        type: 'action',
        relevance: 90
      }
    ];

    render(
      <ChecklistRecommendations
        suggestions={threeSuggestions}
        onAddItem={mockOnAddItem}
        onDismiss={jest.fn()}
        sessionId="test-session"
      />
    );

    const bulkAddButton = screen.getByText('Add All High Priority');
    fireEvent.click(bulkAddButton);

    await waitFor(() => {
      // Should be called twice for the two high priority items
      expect(mockOnAddItem).toHaveBeenCalledTimes(2);
      expect(mockOnAddItem).toHaveBeenCalledWith('Schedule follow-up meeting');
      expect(mockOnAddItem).toHaveBeenCalledWith('Review meeting notes');
    });
  });
});