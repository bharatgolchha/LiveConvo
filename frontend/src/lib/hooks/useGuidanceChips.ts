import useSWR from 'swr';
import { getPresetChips, ConversationType, GuidancePhase, GuidanceChip } from '@/lib/guidancePresets';

interface Params {
  conversationType?: ConversationType;
  phase?: GuidancePhase;
  latestMessage?: string;
  context?: string;
  stage?: string; // callStage for live
  transcript?: string; // Recent transcript for context
}

interface Return {
  chips: GuidanceChip[];
  isLoading: boolean;
  error?: Error;
  refresh: () => void;
  lastUpdated: number | null;
}

const fetcher = async ([url, body]: [string, Record<string, unknown>]): Promise<GuidanceChip[]> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data.suggestedActions)) {
    return data.suggestedActions.map((a: any): GuidanceChip => (typeof a === 'string' ? { text: a.slice(0, 20), prompt: a } : a));
  }
  throw new Error('invalid payload');
};

export const useGuidanceChips = ({ conversationType = 'sales', phase = 'preparation', latestMessage = '', context = '', stage, transcript = '' }: Params): Return => {
  // We fetch dynamic chips in all phases. When no explicit stage is supplied we
  // map phase → default stage expected by the backend chip mode parser.
  // preparation → "opening", analysis → "closing".
  const effectiveStage =
    stage || (phase === 'preparation' ? 'opening' : phase === 'analysis' ? 'closing' : undefined);

  const swrKey = ['/api/chat-guidance',
        {
          message: latestMessage || '(no message)',
          latestMessage,
          context,
          conversationType,
          stage: effectiveStage,
          transcript: transcript || '',
          chatHistory: [],
          isRecording: false,
          transcriptLength: transcript ? transcript.length : 0
        }];

  const { data, error, isLoading, mutate } = useSWR<GuidanceChip[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 60000
  });

  const source = data && data.length ? data : getPresetChips(conversationType, phase);
  const chips: GuidanceChip[] = source
    .sort((a:any,b:any)=>(b.impact||0)-(a.impact||0))
    .slice(0,3)
    .map((chip)=>({ text: chip.text.split(' ').slice(0,6).join(' '), prompt: chip.prompt }));

  return {
    chips,
    isLoading,
    error,
    refresh: () => mutate(),
    lastUpdated: data ? Date.now() : null
  };
}; 