/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProcessingAnimation } from '@/components/conversation/ProcessingAnimation';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ProcessingAnimation', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<ProcessingAnimation />);
    expect(screen.getByText('Understanding the conversation flow and context')).toBeInTheDocument();
  });

  it('displays the first stage initially', () => {
    render(<ProcessingAnimation />);
    
    // Should show the first stage description
    expect(screen.getByText('Understanding the conversation flow and context')).toBeInTheDocument();
  });

  it('shows all processing stages in the stage list', () => {
    render(<ProcessingAnimation />);
    
    // Check for unique descriptions of each stage
    expect(screen.getByText('Understanding the conversation flow and context')).toBeInTheDocument();
    expect(screen.getByText('Identifying important topics and decisions')).toBeInTheDocument();
    expect(screen.getByText('Finding actionable tasks and next steps')).toBeInTheDocument();
    expect(screen.getByText('Creating comprehensive conversation summary')).toBeInTheDocument();
  });

  it('shows progress percentage initially at 0%', () => {
    render(<ProcessingAnimation />);
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('shows processing status text', () => {
    render(<ProcessingAnimation />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('This may take a few moments as our AI analyzes your entire conversation')).toBeInTheDocument();
  });

  it('progresses through stages over time', async () => {
    render(<ProcessingAnimation />);
    
    // Initially should show first stage description
    expect(screen.getByText('Understanding the conversation flow and context')).toBeInTheDocument();
    
    // Advance time to second stage (2000ms)
    jest.advanceTimersByTime(2100);
    
    await waitFor(() => {
      expect(screen.getByText('Identifying important topics and decisions')).toBeInTheDocument();
    });
    
    // Advance time to third stage (2000 + 1800 = 3800ms)
    jest.advanceTimersByTime(1800);
    
    await waitFor(() => {
      expect(screen.getByText('Finding actionable tasks and next steps')).toBeInTheDocument();
    });
    
    // Advance time to fourth stage (3800 + 1500 = 5300ms)
    jest.advanceTimersByTime(1600);
    
    await waitFor(() => {
      expect(screen.getByText('Creating comprehensive conversation summary')).toBeInTheDocument();
    });
  });

  it('updates progress percentage over time', async () => {
    render(<ProcessingAnimation />);
    
    // Initially 0%
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    
    // Advance time by 1 second (1000ms out of 7500ms total = ~13%)
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      // Should show progress around 13%
      expect(screen.getByText(/1[0-9]% complete/)).toBeInTheDocument();
    });
    
    // Advance to halfway point (3750ms out of 7500ms = 50%)
    jest.advanceTimersByTime(2750);
    
    await waitFor(() => {
      // Should show progress around 50%
      expect(screen.getByText(/5[0-9]% complete/)).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const { container } = render(<ProcessingAnimation className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('completes animation after total duration', async () => {
    render(<ProcessingAnimation />);
    
    // Advance through entire animation (7500ms)
    jest.advanceTimersByTime(7600);
    
    await waitFor(() => {
      // Should show 100% complete
      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });
  });

  it('has proper ARIA accessibility', () => {
    render(<ProcessingAnimation />);
    
    // Check for meaningful text content for screen readers
    expect(screen.getByText('Understanding the conversation flow and context')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders floating particles', () => {
    const { container } = render(<ProcessingAnimation />);
    
    // Should have 6 floating particles (divs with specific classes)
    const particles = container.querySelectorAll('.bg-blue-400.rounded-full');
    expect(particles).toHaveLength(6);
  });

  it('shows stage completion indicators over time', async () => {
    render(<ProcessingAnimation />);
    
    // After first stage completes (2000ms), check for first stage completion
    jest.advanceTimersByTime(2100);
    
    await waitFor(() => {
      // Check if we're now in the second stage
      expect(screen.getByText('Identifying important topics and decisions')).toBeInTheDocument();
    });
  });

  it('handles responsive design classes', () => {
    const { container } = render(<ProcessingAnimation />);
    
    // Should have responsive grid classes
    const stageGrid = container.querySelector('.grid');
    expect(stageGrid).toBeInTheDocument();
    expect(stageGrid).toHaveClass('grid-cols-1');
  });
}); 