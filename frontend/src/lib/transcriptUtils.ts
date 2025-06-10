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

/**
 * Calculate talk statistics from speaker transcripts.
 * Returns stats with word counts and percentages.
 */
export function calculateTalkStats(
  speaker1Transcript: string,
  speaker2Transcript: string
): {
  speaker1Percentage: number;
  speaker2Percentage: number;
  totalWords: number;
  speaker1Words: number;
  speaker2Words: number;
} {
  const speaker1Words = speaker1Transcript.trim().split(/\s+/).filter(Boolean).length;
  const speaker2Words = speaker2Transcript.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = speaker1Words + speaker2Words;
  
  const speaker1Percentage = totalWords > 0 ? Math.round((speaker1Words / totalWords) * 100) : 0;
  const speaker2Percentage = totalWords > 0 ? Math.round((speaker2Words / totalWords) * 100) : 0;
  
  return {
    speaker1Percentage,
    speaker2Percentage,
    totalWords,
    speaker1Words,
    speaker2Words
  };
}
