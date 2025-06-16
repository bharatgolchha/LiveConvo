import { useMemo } from 'react';

export type CallStage = 'opening' | 'discovery' | 'demo' | 'pricing' | 'closing';

interface Params {
  elapsedSec: number;
  transcriptSlice: string;
}

const regexMap: Record<CallStage, RegExp[]> = {
  opening: [/^hi|hello|good (morning|afternoon|evening)/i],
  discovery: [/\b(problem|challenge|goal)s?\b/i],
  demo: [/\b(feature|demo|show you)\b/i],
  pricing: [/\b(price|cost|budget|dollar)\b/i],
  closing: [/\bnext steps|timeline|contract|sign\b/i]
};

export const useCallStage = ({ elapsedSec, transcriptSlice }: Params): CallStage => {
  return useMemo<CallStage>(() => {
    if (elapsedSec < 120) return 'opening';

    for (const [stage, patterns] of Object.entries(regexMap)) {
      for (const pat of patterns) {
        if (pat.test(transcriptSlice)) return stage as CallStage;
      }
    }
    // default
    return 'discovery';
  }, [elapsedSec, transcriptSlice]);
}; 