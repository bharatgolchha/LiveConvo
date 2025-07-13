-- Migration: 003_create_email_notifications_table.sql
-- Purpose: Create the email_notifications table that exists in Dev but is missing in Prod
-- This table tracks email notifications sent to users

-- Create the email_notifications table
CREATE TABLE IF NOT EXISTS public.email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_email_notifications_session_id ON public.email_notifications(session_id);
CREATE INDEX idx_email_notifications_user_id ON public.email_notifications(user_id);
CREATE INDEX idx_email_notifications_email_type ON public.email_notifications(email_type);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see email notifications related to them
CREATE POLICY "Users can view own email notifications" ON public.email_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all email notifications
CREATE POLICY "Service role can manage email notifications" ON public.email_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_email_notifications_updated_at_trigger
    BEFORE UPDATE ON public.email_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notifications_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.email_notifications IS 'Tracks all email notifications sent to users with delivery status';