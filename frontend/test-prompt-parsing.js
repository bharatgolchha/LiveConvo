// Test the parsePromptSuggestions function
function parsePromptSuggestions(raw) {
  if (\!raw) return [];
  
  // First, try to parse as direct JSON
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.suggestions)) {
      return parsed.suggestions
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4);
    }
  } catch {
    // If direct parsing fails, try to extract JSON from the content
  }
  
  // Strip code fences and optional language labels
  let content = raw.trim()
    .replace(/^```[a-zA-Z]*\s*/gm, '')
    .replace(/```\s*$/gm, '')
    .trim();

  // Try to extract JSON object from within content
  const jsonMatches = content.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/g);
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        if (Array.isArray(parsed?.suggestions)) {
          const suggestions = parsed.suggestions
            .filter((s) => typeof s === 'string' && s.trim().length > 0)
            .map((s) => s.trim())
            .slice(0, 4);
          
          // Only return if we got at least 2 valid suggestions
          if (suggestions.length >= 2) {
            return suggestions;
          }
        }
      } catch {
        // Try next match
      }
    }
  }

  // Enhanced fallback: Look for numbered or bulleted lists
  const lines = content.split('\n');
  const candidates = [];
  
  for (const line of lines) {
    // Remove common list markers and quotes
    const cleaned = line
      .replace(/^[\s"'`]*/, '') // Remove leading whitespace and quotes
      .replace(/^[\d]+[\.\)\-\s]+/, '') // Remove numbered list markers
      .replace(/^[\*\-\+•]\s*/, '') // Remove bullet markers  
      .replace(/["'`]*[\s,]*$/, '') // Remove trailing quotes and punctuation
      .trim();
    
    // Only add non-empty lines that look like prompts (at least 20 chars)
    if (cleaned && cleaned.length > 20 && \!cleaned.startsWith('{') && \!cleaned.includes('```')) {
      candidates.push(cleaned);
    }
  }
  
  return candidates.slice(0, 4);
}

// Test cases
const testCases = [
  {
    name: "Valid JSON",
    input: '{"suggestions": ["Generate executive summary", "Create technical report", "List action items", "Draft stakeholder update"]}',
    expected: 4
  },
  {
    name: "JSON with code fence",
    input: '```json\n{"suggestions": ["Generate executive summary", "Create technical report"]}\n```',
    expected: 2
  },
  {
    name: "Malformed with list",
    input: '1. Generate executive summary for the meeting\n2. Create technical report detailing all aspects\n3. List action items from discussion',
    expected: 3
  }
];

testCases.forEach(test => {
  const result = parsePromptSuggestions(test.input);
  console.log(`Test: ${test.name}`);
  console.log(`  Result count: ${result.length} (expected: ${test.expected})`);
  console.log(`  Pass: ${result.length === test.expected ? '✓' : '✗'}`);
});
