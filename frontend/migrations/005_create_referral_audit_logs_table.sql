-- Migration: 005_create_referral_audit_logs_table.sql
-- Purpose: Create the referral_audit_logs table that exists in Dev but is missing in Prod
-- This table provides comprehensive audit trail for referral system events
-- Note: Requires referral_event_type enum to be created first (001_create_referral_event_type_enum.sql)

-- Create the referral_audit_logs table
CREATE TABLE IF NOT EXISTS public.referral_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type referral_event_type NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    referee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    referral_id UUID REFERENCES public.user_referrals(id) ON DELETE SET NULL,
    referral_code VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(255),
    event_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_referral_audit_logs_user_id ON public.referral_audit_logs(user_id);
CREATE INDEX idx_referral_audit_logs_referrer_id ON public.referral_audit_logs(referrer_id);
CREATE INDEX idx_referral_audit_logs_event_type ON public.referral_audit_logs(event_type);
CREATE INDEX idx_referral_audit_logs_referral_code ON public.referral_audit_logs(referral_code);
CREATE INDEX idx_referral_audit_logs_created_at ON public.referral_audit_logs(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.referral_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see logs related to them (as referrer or referee)
CREATE POLICY "Users can view own referral logs" ON public.referral_audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = referrer_id OR 
        auth.uid() = referee_id
    );

-- Policy: Service role can manage all audit logs
CREATE POLICY "Service role can manage referral audit logs" ON public.referral_audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.referral_audit_logs IS 'Comprehensive audit trail for all referral system events including clicks, validations, completions, and fraud detection';