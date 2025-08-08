import { parsePromptSuggestions } from '@/lib/reports/promptSuggestions';

describe('parsePromptSuggestions', () => {
  it('parses JSON suggestions array', () => {
    const content = JSON.stringify({ suggestions: ['A', 'B', 'C', 'D', 'E'] });
    expect(parsePromptSuggestions(content)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('falls back to line splitting when JSON is not provided', () => {
    const content = '- First\n- Second\n- Third\n- Fourth\n- Fifth';
    expect(parsePromptSuggestions(content)).toEqual(['First', 'Second', 'Third', 'Fourth']);
  });

  it('returns empty array for invalid input', () => {
    expect(parsePromptSuggestions('')).toEqual([]);
  });
});


