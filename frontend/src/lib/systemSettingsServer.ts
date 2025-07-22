import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Fetch the value of a system setting from the database.
 * Uses the service-role Supabase client so RLS is bypassed and
 * no user token is required.
 */
export async function getSystemSetting<T = unknown>(key: string): Promise<T | null> {
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

  // Handle JSONB stored strings - if value is a string wrapped in quotes, unwrap it
  const value = data?.value;
  if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  
  return (value as T) ?? null;
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
    'google/gemini-2.5-flash'
  );
} 