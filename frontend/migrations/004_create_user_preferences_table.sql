-- Migration: 004_create_user_preferences_table.sql
-- Purpose: Create the user_preferences table that exists in Dev but is missing in Prod
-- This table stores user notification preferences

-- Create the user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    email_notifications_enabled BOOLEAN DEFAULT true,
    email_post_call_summary BOOLEAN DEFAULT true,
    email_weekly_digest BOOLEAN DEFAULT false,
    email_important_insights BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id (unique constraint already creates an index, but adding for clarity)
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically create user preferences on user signup
CREATE OR REPLACE FUNCTION create_user_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create preferences for new users
CREATE TRIGGER create_user_preferences_on_signup
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_preferences_for_new_user();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_user_preferences_updated_at_trigger
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.user_preferences IS 'Stores user notification and email preferences';