import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewConversationModal from '@/components/dashboard/NewConversationModal';
import { Session } from '@/lib/hooks/useSessions';

const mockSessions: Session[] = [
  {
    id: 'session-1',
    title: 'Previous Sales Call',
    status: 'completed',
    conversation_type: 'sales',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'session-2', 
    title: 'Support Session',
    status: 'completed',
    conversation_type: 'support',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

describe('NewConversationModal - Custom Types', () => {
  const mockOnStart = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnStart.mockClear();
    mockOnClose.mockClear();
  });

  it('shows all conversation type options including custom', () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    expect(screen.getByText('Sales Call')).toBeInTheDocument();
    expect(screen.getByText('Customer Support')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Coaching Session')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('shows custom type input when custom is selected', () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    // Click on Custom type
    fireEvent.click(screen.getByText('Custom'));
    
    // Should show custom type input
    expect(screen.getByLabelText('Custom Type Name *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Discovery Call, Demo/)).toBeInTheDocument();
  });

  it('requires custom type name when custom is selected', () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    // Fill in title
    fireEvent.change(screen.getByPlaceholderText(/Enter a descriptive title/), {
      target: { value: 'Test Call' }
    });
    
    // Select custom type
    fireEvent.click(screen.getByText('Custom'));
    
    // Next button should be disabled without custom type name
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
    
    // Fill in custom type
    fireEvent.change(screen.getByPlaceholderText(/e.g. Discovery Call, Demo/), {
      target: { value: 'Discovery Call' }
    });
    
    // Next button should now be enabled
    expect(nextButton).not.toBeDisabled();
  });

  it('submits with custom type name when custom is selected', async () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    // Fill in title
    fireEvent.change(screen.getByPlaceholderText(/Enter a descriptive title/), {
      target: { value: 'Test Discovery Call' }
    });
    
    // Select custom type
    fireEvent.click(screen.getByText('Custom'));
    
    // Fill in custom type name
    fireEvent.change(screen.getByPlaceholderText(/e.g. Discovery Call, Demo/), {
      target: { value: 'Discovery Call' }
    });
    
    // Go to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Start conversation
    fireEvent.click(screen.getByRole('button', { name: /start conversation/i }));
    
    await waitFor(() => {
      expect(mockOnStart).toHaveBeenCalledWith({
        title: 'Test Discovery Call',
        conversationType: 'Discovery Call', // Should use custom type name
        context: { text: '', files: [] },
        selectedPreviousConversations: []
      });
    });
  });

  it('submits with predefined type when not custom', async () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    // Fill in title
    fireEvent.change(screen.getByPlaceholderText(/Enter a descriptive title/), {
      target: { value: 'Test Sales Call' }
    });
    
    // Sales is selected by default
    expect(screen.getByText('Sales Call')).toBeInTheDocument();
    
    // Go to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Start conversation
    fireEvent.click(screen.getByRole('button', { name: /start conversation/i }));
    
    await waitFor(() => {
      expect(mockOnStart).toHaveBeenCalledWith({
        title: 'Test Sales Call',
        conversationType: 'sales', // Should use predefined type
        context: { text: '', files: [] },
        selectedPreviousConversations: []
      });
    });
  });

  it('shows different context placeholder for custom type', () => {
    render(
      <NewConversationModal
        isOpen={true}
        onClose={mockOnClose}
        onStart={mockOnStart}
        sessions={mockSessions}
      />
    );

    // Default placeholder for sales
    expect(screen.getByPlaceholderText(/Add any relevant background information/)).toBeInTheDocument();
    
    // Select custom type
    fireEvent.click(screen.getByText('Custom'));
    
    // Should show custom placeholder
    expect(screen.getByPlaceholderText(/Describe what you want to achieve/)).toBeInTheDocument();
  });
}); 