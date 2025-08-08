export function parsePromptSuggestions(raw: string): string[] {
  if (!raw) return [];
  // Strip code fences ``` and optional language labels
  let content = raw.trim()
    .replace(/^```[a-zA-Z]*\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  // Try to extract JSON object from within content
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.suggestions)) {
        return parsed.suggestions
          .filter((s: any) => typeof s === 'string')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 4);
      }
    } catch {
      // fall through
    }
  }

  // Fallback: split by lines/bullets and clean up common cruft
  const candidates = content
    .split('\n')
    .map(line => line.replace(/^\s*[`\-\*\d\.\)\(]+\s*/, '').trim())
    .filter(Boolean);
  return candidates.slice(0, 4);
}


