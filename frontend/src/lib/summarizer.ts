import fetch from 'node-fetch';

/**
 * Generate an updated running summary given the previous summary and a new transcript chunk.
 * The resulting summary should stay concise (<= 400 tokens) and cumulative – it must already
 * include older information plus the new chunk.
 */
export async function updateRunningSummary(
  prevSummary: string | undefined,
  newTranscriptChunk: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Fallback: just concatenate and truncate if no key.
    return `${prevSummary || ''}\n${newTranscriptChunk}`.slice(-2000);
  }

  const systemPrompt = `You are an expert note-taker. Merge the NEW TRANSCRIPT CHUNK into the EXISTING SUMMARY.
Return a concise cumulative summary (max 250 words) that preserves key decisions, action items and topics.`;

  const userPrompt = `EXISTING SUMMARY:\n${prevSummary || 'None yet.'}\n\nNEW TRANSCRIPT CHUNK:\n${newTranscriptChunk}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai summarizer',
    },
    body: JSON.stringify({
      model: 'google/gemini-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    console.error('Summarizer LLM error', res.status, await res.text());
    // fallback concatenate/truncate
    return `${prevSummary || ''}\n${newTranscriptChunk}`.slice(-2000);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
} 