import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationStatus } from '@/components/conversation/ConversationHeader/ConversationStatus';

describe('ConversationStatus', () => {
  it('should render title and state', () => {
    render(
      <ConversationStatus
        title="Test Conversation"
        state="ready"
      />
    );

    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should render appropriate icon for each state', () => {
    const { rerender } = render(
      <ConversationStatus title="Test" state="setup" />
    );
    expect(screen.getByText('Setup')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="ready" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="recording" />);
    expect(screen.getByText('Recording')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    rerender(<ConversationStatus title="Test" state="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should show duration for recording and paused states', () => {
    const { rerender } = render(
      <ConversationStatus
        title="Test"
        state="recording"
        duration={125}
      />
    );

    expect(screen.getByText('02:05')).toBeInTheDocument();

    rerender(
      <ConversationStatus
        title="Test"
        state="paused"
        duration={3661}
      />
    );

    expect(screen.getByText('1:01:01')).toBeInTheDocument();
  });

  it('should not show duration for other states', () => {
    render(
      <ConversationStatus
        title="Test"
        state="ready"
        duration={125}
      />
    );

    expect(screen.queryByText('02:05')).not.toBeInTheDocument();
  });

  it('should show protected indicator when recording', () => {
    render(
      <ConversationStatus
        title="Test"
        state="recording"
      />
    );

    expect(screen.getByTitle('Recording protected from tab switches')).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('should show tab return indicator when paused after being hidden', () => {
    render(
      <ConversationStatus
        title="Test"
        state="paused"
        wasRecordingBeforeHidden={true}
      />
    );

    expect(screen.getByTitle('Paused due to tab switch - click Resume to continue')).toBeInTheDocument();
    expect(screen.getByText('Tab Return')).toBeInTheDocument();
  });

  it('should not show indicators for other states', () => {
    render(
      <ConversationStatus
        title="Test"
        state="ready"
        wasRecordingBeforeHidden={true}
      />
    );

    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    expect(screen.queryByText('Tab Return')).not.toBeInTheDocument();
  });

  it('should truncate long titles with ellipsis', () => {
    const longTitle = 'This is a very long conversation title that should be truncated';
    render(
      <ConversationStatus
        title={longTitle}
        state="ready"
      />
    );

    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
    expect(titleElement).toHaveAttribute('title', longTitle);
  });

  it('should apply correct color classes for each state', () => {
    const { rerender } = render(
      <ConversationStatus title="Test" state="setup" />
    );
    let badge = screen.getByText('Setup').closest('div');
    // The color classes are applied as a string from getStateTextAndColor
    // So we need to check if the className includes these values
    expect(badge?.className).toContain('text-gray-500');
    expect(badge?.className).toContain('bg-gray-100');

    rerender(<ConversationStatus title="Test" state="ready" />);
    badge = screen.getByText('Ready').closest('div');
    expect(badge?.className).toContain('text-blue-600');
    expect(badge?.className).toContain('bg-blue-100');

    rerender(<ConversationStatus title="Test" state="recording" />);
    badge = screen.getByText('Recording').closest('div');
    expect(badge?.className).toContain('text-red-600');
    expect(badge?.className).toContain('bg-red-100');
    expect(badge?.className).toContain('animate-pulse');

    rerender(<ConversationStatus title="Test" state="paused" />);
    badge = screen.getByText('Paused').closest('div');
    expect(badge?.className).toContain('text-yellow-600');
    expect(badge?.className).toContain('bg-yellow-100');

    rerender(<ConversationStatus title="Test" state="processing" />);
    badge = screen.getByText('Processing').closest('div');
    expect(badge?.className).toContain('text-purple-600');
    expect(badge?.className).toContain('bg-purple-100');

    rerender(<ConversationStatus title="Test" state="completed" />);
    badge = screen.getByText('Completed').closest('div');
    expect(badge?.className).toContain('text-green-600');
    expect(badge?.className).toContain('bg-green-100');

    rerender(<ConversationStatus title="Test" state="error" />);
    badge = screen.getByText('Error').closest('div');
    expect(badge?.className).toContain('text-red-700');
    expect(badge?.className).toContain('bg-red-100');
  });
});