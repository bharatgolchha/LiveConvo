import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Fetch the value of a system setting from the database.
 * Uses the service-role Supabase client so RLS is bypassed and
 * no user token is required.
 */
export async function getSystemSetting<T = any>(key: string): Promise<T | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    // Log once – downstream code will fall back to env var / default
    console.error(`Error fetching system setting "${key}":`, error);
    return null;
  }

  return (data?.value as T) ?? null;
}

/**
 * Convenience helper to get the default AI model server-side.
 * Falls back to ENV then hard-coded value if the DB row is missing.
 */
export async function getDefaultAiModelServer(): Promise<string> {
  const dbValue = await getSystemSetting<string>('default_ai_model');
  return (
    dbValue ||
    process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
    'google/gemini-2.5-flash-preview-05-20'
  );
} 