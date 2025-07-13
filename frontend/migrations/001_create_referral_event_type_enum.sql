-- Migration: 001_create_referral_event_type_enum.sql
-- Purpose: Create the referral_event_type enum that exists in Dev but is missing in Prod
-- This enum is required for the referral_audit_logs table

-- Create the referral_event_type enum
CREATE TYPE referral_event_type AS ENUM (
    'link_clicked',
    'code_validated',
    'code_invalid',
    'signup_attempted',
    'signup_completed',
    'self_referral_blocked',
    'payment_completed',
    'credit_scheduled',
    'credit_granted',
    'credit_failed',
    'refund_processed',
    'fraud_detected',
    'error'
);

-- Add comment for documentation
COMMENT ON TYPE referral_event_type IS 'Enum type for tracking different referral system events';