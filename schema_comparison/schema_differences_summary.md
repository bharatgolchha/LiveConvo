# Database Schema Comparison: Dev vs Production

## Overview
- **Production**: PostgreSQL 17.4 (xkxjycccifwyxgtvflxz)
- **Development**: PostgreSQL 15.8 (ucvfgfbjcrxbzppwjpuu)
- **Total diff lines**: 17,506 lines

## Key Infrastructure Differences

### 1. PostgreSQL Version
- **Production**: 17.4.1.048
- **Development**: 15.8.1.093

### 2. New Tables
- **Development has extra table**: `supabase_migrations.seed_files` (not present in production)

## Major Function Differences

### Functions Present ONLY in Development
- `can_access_session(p_session_id uuid, p_user_id uuid)` - Session access validation
- `check_single_owner_org_per_user()` - Organization ownership validation
- `cleanup_old_usage_data(months_to_keep integer)` - Data cleanup utility
- `create_default_user_preferences()` - User preferences setup
- `get_session_participants(p_session_id uuid)` - Session participant retrieval
- `get_unread_mentions_count(p_user_id uuid)` - Mention counting
- `handle_updated_at()` - Generic updated_at handler
- `is_valid_referral_code(code text)` - Referral validation
- `log_comment_activity()` - Comment activity logging
- `log_task_activity()` - Task activity logging
- `sync_session_participants()` - Participant synchronization
- `test_user_access()`, `test_users_rls()`, `test_users_rls_policies()` - Testing functions
- `track_minute_usage()` - Usage tracking
- `update_bot_usage_tracking_updated_at()` - Bot usage tracking
- `update_calendar_updated_at()` - Calendar update handling
- `update_monthly_usage_cache()` - Usage cache management
- `update_session_stats()` - Session statistics

### Functions Present ONLY in Production
- `check_and_enforce_bot_limits()` - Bot usage limit enforcement
- `check_referral_limits()` - Referral fraud prevention
- `check_webhook_health()` - Webhook monitoring
- `create_user_preferences_for_new_user()` - Legacy user preferences
- `handle_new_user_referral()` - Referral processing
- `start_bot_grace_period()` - Bot grace period management
- `update_email_notifications_updated_at()` - Email notification updates
- `update_user_preferences_updated_at()` - User preferences updates

### Modified Functions
- `auto_complete_orphaned_recordings()` - Different return structure
- `check_usage_limit()` - Different return types (numeric vs integer)
- `get_user_billing_period()` - Different return column names
- `process_referral_code()` - Different parameter signatures
- Vector embedding functions use different types:
  - **Production**: `public.vector`
  - **Development**: `public.halfvec`

## Major Trigger Differences

### Triggers Present ONLY in Development
- `create_user_preferences_on_signup` - On auth.users
- `on_auth_user_created` - On auth.users  
- `auto_calculate_bot_usage` - Replaces calculate_bot_usage_metrics_trigger
- `enforce_single_owner_org` - Organization validation
- `set_updated_at`, `set_webhook_logs_updated_at` - Updated_at handling
- `sync_participants_on_calendar_update` - Calendar sync
- `trigger_log_comment_activity`, `trigger_log_task_activity` - Activity logging
- Multiple `update_*_updated_at` triggers for various tables
- `update_cache_on_bot_usage` - Cache management

### Triggers Present ONLY in Production
- `calculate_bot_usage_metrics_trigger` - On bot_usage_tracking
- `generate_user_referral_code_trigger` - On users
- `on_user_created_referral` - Referral handling
- `update_email_notifications_updated_at_trigger` - Email notifications
- `update_user_preferences_updated_at_trigger` - User preferences

### Modified Triggers
- `ensure_user_has_referral_code` vs `generate_user_referral_code_trigger` - Different conditions
- `handle_subscription_renewal_trigger` - Added WHEN condition in dev
- `sessions_embedding_trigger` - Same functionality, different placement

## Critical Differences Summary

### 1. Embedding System
- **Production**: Uses `vector` type for embeddings
- **Development**: Uses `halfvec` type for embeddings
- This affects all similarity search and embedding functions

### 2. User Management
- **Development**: More comprehensive user lifecycle management
- **Development**: Better RLS (Row Level Security) testing functions
- **Development**: Enhanced user preferences handling

### 3. Organization Management  
- **Development**: Single owner validation per organization
- **Production**: No such validation

### 4. Usage Tracking
- **Development**: More detailed usage tracking and caching
- **Production**: Simpler bot limit enforcement

### 5. Activity Logging
- **Development**: Comprehensive activity logging for comments and tasks
- **Production**: No such logging

### 6. Calendar Integration
- **Development**: Better calendar event synchronization
- **Production**: Missing calendar sync triggers

## Recommendations

### Critical Issues to Address
1. **Embedding Type Mismatch**: Align vector vs halfvec usage
2. **Missing Functions**: Sync critical functions like `can_access_session`
3. **Missing Triggers**: Add activity logging and calendar sync triggers
4. **Usage Tracking**: Implement enhanced usage tracking from dev
5. **Organization Validation**: Add single owner validation

### Migration Priority
1. **High**: Embedding system alignment
2. **High**: Security functions (access control, RLS)
3. **Medium**: Activity logging and analytics
4. **Medium**: Calendar synchronization
5. **Low**: Testing utilities

The development database appears to be more feature-complete with better security, logging, and user management capabilities. 