import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationContent } from '@/components/conversation/ConversationContent';
import { TranscriptLine } from '@/types/app';

// Minimal props for ConversationContent
function renderComponent() {
  const dummyTranscript: TranscriptLine[] = [
    { id: '1', speaker: 'ME', text: 'Hello', timestamp: new Date().toISOString() },
  ];

  render(
    <ConversationContent
      activeTab="summary"
      setActiveTab={() => {}}
      conversationState="completed"
      isSummarizing={false}
      transcript={dummyTranscript}
      summary={{
        tldr: 'Test',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: [],
        sentiment: 'neutral',
        progressStatus: 'wrapping_up',
      }}
      isSummaryLoading={false}
      summaryError={null}
      summaryLastUpdated={new Date()}
      refreshSummary={() => {}}
      isFullscreen={false}
      setIsFullscreen={() => {}}
      handleStartRecording={() => {}}
      handleExportSession={() => {}}
      selectedPreviousConversations={["prev1", "prev2"]}
      previousConversationsContext={"1. Foo TL;DR\n2. Bar TL;DR"}
      getSummaryTimeUntilNextRefresh={() => 0}
    />
  );
}

describe('ConversationContent previous summaries accordion', () => {
  it('renders accordion title with correct count and toggles content', () => {
    renderComponent();

    const summaryTitle = screen.getByText(/Previous Conversation Summaries \(2\)/i);
    expect(summaryTitle).toBeInTheDocument();

    // Content hidden by default
    expect(screen.queryByText(/Foo TL;DR/)).not.toBeInTheDocument();

    // Expand
    fireEvent.click(summaryTitle);
    expect(screen.getByText(/Foo TL;DR/)).toBeInTheDocument();
  });
}); 