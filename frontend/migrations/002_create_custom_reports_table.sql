-- Migration: 002_create_custom_reports_table.sql
-- Purpose: Create the custom_reports table that exists in Dev but is missing in Prod
-- This table stores custom generated reports for sessions

-- Create the custom_reports table
CREATE TABLE IF NOT EXISTS public.custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    template VARCHAR(100) DEFAULT 'custom',
    generated_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_custom_reports_session_id ON public.custom_reports(session_id);
CREATE INDEX idx_custom_reports_user_id ON public.custom_reports(user_id);
CREATE INDEX idx_custom_reports_created_at ON public.custom_reports(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own custom reports
CREATE POLICY "Users can view own custom reports" ON public.custom_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own custom reports
CREATE POLICY "Users can create own custom reports" ON public.custom_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own custom reports
CREATE POLICY "Users can update own custom reports" ON public.custom_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own custom reports
CREATE POLICY "Users can delete own custom reports" ON public.custom_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.custom_reports IS 'Stores custom generated reports for conversation sessions';