export function getDefaultAiModel(systemSettings?: { default_ai_model?: string }): string {
  /**
   * Determine the default AI model (LLM) that the application should use.
   *
   * Priority order:
   * 1) Admin-controlled value from the `system_settings` table (if provided).
   * 2) NEXT_PUBLIC_OPENROUTER_MODEL environment variable.
   * 3) Hard-coded fallback.
   */
  return (
    systemSettings?.default_ai_model ||
    process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
    'google/gemini-2.5-flash'
  );
} 