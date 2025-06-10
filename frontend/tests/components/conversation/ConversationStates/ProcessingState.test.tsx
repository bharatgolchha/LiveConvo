import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProcessingState } from '@/components/conversation/ConversationStates/ProcessingState';

describe('ProcessingState', () => {
  it('should render processing title and description', () => {
    render(<ProcessingState />);

    expect(screen.getByText('Processing Your Conversation')).toBeInTheDocument();
    expect(screen.getByText(/We're analyzing your conversation/)).toBeInTheDocument();
  });

  it('should render all processing steps', () => {
    render(<ProcessingState />);

    expect(screen.getByText('Finalizing transcript')).toBeInTheDocument();
    expect(screen.getByText('Analyzing conversation')).toBeInTheDocument();
    expect(screen.getByText('Generating insights')).toBeInTheDocument();
  });

  it('should render time estimate', () => {
    render(<ProcessingState />);

    expect(screen.getByText('This usually takes 10-15 seconds...')).toBeInTheDocument();
  });

  it('should render with proper container styling', () => {
    const { container } = render(<ProcessingState />);

    const mainDiv = container.querySelector('.flex.flex-col.items-center.justify-center');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv).toHaveClass('h-full', 'py-12');
  });

  it('should render rotating animation container', () => {
    const { container } = render(<ProcessingState />);

    // Look for the rotating RefreshCw icon container
    const rotatingElement = container.querySelector('.absolute.inset-0');
    expect(rotatingElement).toBeInTheDocument();
  });

  it('should render progress bar container', () => {
    const { container } = render(<ProcessingState />);

    const progressBar = container.querySelector('.bg-gray-200.rounded-full.h-2');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render brain icon in center', () => {
    const { container } = render(<ProcessingState />);

    const brainContainer = container.querySelector('.bg-purple-100.rounded-full');
    expect(brainContainer).toBeInTheDocument();
  });

  it('should accept activeTab prop', () => {
    const { rerender } = render(<ProcessingState activeTab="transcript" />);
    expect(screen.getByText('Processing Your Conversation')).toBeInTheDocument();

    rerender(<ProcessingState activeTab="summary" />);
    expect(screen.getByText('Processing Your Conversation')).toBeInTheDocument();

    rerender(<ProcessingState activeTab="guidance" />);
    expect(screen.getByText('Processing Your Conversation')).toBeInTheDocument();
  });
});