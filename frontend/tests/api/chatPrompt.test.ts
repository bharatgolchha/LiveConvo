import { buildChatPrompt } from '@/lib/chatPromptBuilder';

describe('buildChatPrompt', () => {
  const baseMessage = 'What next?';

  it('includes all messages verbatim when history is short', () => {
    const history = [
      { id: '1', type: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', type: 'ai', content: 'Hi there', timestamp: new Date() }
    ] as any;

    const prompt = buildChatPrompt(baseMessage, '', history);

    expect(prompt).toContain('CHAT HISTORY:');
    expect(prompt).toContain('User: Hello');
    expect(prompt).toContain('AI: Hi there');
  });

  it('summarises older messages when history is long', () => {
    const longHistory = Array.from({ length: 8 }).map((_, i) => ({
      id: `${i}`,
      type: i % 2 === 0 ? 'user' : 'ai',
      content: `msg${i + 1}`,
      timestamp: new Date()
    })) as any;

    const prompt = buildChatPrompt(baseMessage, '', longHistory);

    expect(prompt).toContain('PREVIOUS CHAT SUMMARY');
    expect(prompt).toContain('- User: msg1');
    expect(prompt).toContain('RECENT CHAT MESSAGES');
    expect(prompt).toContain('AI: msg8');
  });
});
