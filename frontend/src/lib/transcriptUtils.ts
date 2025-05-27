export interface TalkStats {
  meWords: number;
  themWords: number;
}

/**
 * Update talk statistics based on the speaker and text.
 * Returns new stats object with updated word counts.
 */
export function updateTalkStats(
  stats: TalkStats,
  speaker: 'ME' | 'THEM',
  text: string
): TalkStats {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (speaker === 'ME') {
    return { ...stats, meWords: stats.meWords + words };
  }
  return { ...stats, themWords: stats.themWords + words };
}
