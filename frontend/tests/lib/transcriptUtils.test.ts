import { updateTalkStats } from '@/lib/transcriptUtils';

describe('updateTalkStats', () => {
  it('increments meWords when speaker is ME', () => {
    const stats = { meWords: 0, themWords: 0 };
    const result = updateTalkStats(stats, 'ME', 'hello world');
    expect(result.meWords).toBe(2);
    expect(result.themWords).toBe(0);
  });

  it('increments themWords when speaker is THEM', () => {
    const stats = { meWords: 1, themWords: 0 };
    const result = updateTalkStats(stats, 'THEM', 'testing one two');
    expect(result.meWords).toBe(1);
    expect(result.themWords).toBe(3);
  });
});
