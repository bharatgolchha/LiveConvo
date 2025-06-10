import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationMainContent } from '@/components/conversation/ConversationLayout/ConversationMainContent';

describe('ConversationMainContent', () => {
  it('should render children', () => {
    render(
      <ConversationMainContent>
        <div>Main Content</div>
      </ConversationMainContent>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should not show error when no error provided', () => {
    render(
      <ConversationMainContent>
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('should display error message when error is provided', () => {
    render(
      <ConversationMainContent error="Something went wrong">
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should show dismiss button when onErrorDismiss is provided', () => {
    const onDismiss = jest.fn();
    
    render(
      <ConversationMainContent 
        error="Test error" 
        onErrorDismiss={onDismiss}
      >
        <div>Content</div>
      </ConversationMainContent>
    );

    const dismissButton = screen.getByLabelText('Dismiss error');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onErrorDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    
    render(
      <ConversationMainContent 
        error="Test error" 
        onErrorDismiss={onDismiss}
      >
        <div>Content</div>
      </ConversationMainContent>
    );

    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not show dismiss button when no onErrorDismiss handler', () => {
    render(
      <ConversationMainContent error="Test error">
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ConversationMainContent className="custom-content">
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(container.firstChild).toHaveClass('custom-content');
  });

  it('should have proper layout classes', () => {
    const { container } = render(
      <ConversationMainContent>
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(container.firstChild).toHaveClass('flex-1', 'flex', 'flex-col', 'h-full', 'overflow-hidden');
  });

  it('should render error with alert icon', () => {
    render(
      <ConversationMainContent error="Test error">
        <div>Content</div>
      </ConversationMainContent>
    );

    // Check for the alert container
    const errorContainer = screen.getByText('Error').closest('div')?.parentElement;
    expect(errorContainer).toHaveClass('bg-destructive/10', 'border-destructive/20');
  });

  it('should handle null error gracefully', () => {
    render(
      <ConversationMainContent error={null}>
        <div>Content</div>
      </ConversationMainContent>
    );

    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});