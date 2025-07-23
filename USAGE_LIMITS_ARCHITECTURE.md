# LivePrompt.ai Usage Limits Architecture Guide

## Overview

This document explains how usage limits work in LivePrompt.ai, including the database structure, API endpoints, and UI components involved in displaying and enforcing user limits based on their subscription plan.

## The Issue That Was Fixed

**Problem**: Users on the Max plan (unlimited) were seeing "10 hours" in their dashboard instead of "Unlimited".

**Root Cause**: The `check_usage_limit` database function was defaulting to 10 hours when the organization's limit was NULL, instead of checking the user's actual subscription plan.

## Database Structure

### Key Tables

1. **users**
   - `id`: User UUID
   - `email`: User email
   - `current_organization_id`: The organization the user belongs to

2. **organizations**
   - `id`: Organization UUID
   - `monthly_audio_hours_limit`: Organization-wide limit (NULL means unlimited)

3. **active_user_subscriptions** (View)
   - `user_id`: User UUID
   - `plan_name`: Plan identifier (e.g., 'free', 'pro', 'max')
   - `plan_display_name`: Human-readable plan name
   - `plan_audio_hours_limit`: Hours limit for the plan (NULL means unlimited)
   - `status`: Subscription status ('active', 'canceled', etc.)

4. **monthly_usage_cache**
   - `user_id`: User UUID
   - `organization_id`: Organization UUID
   - `month_year`: Format 'YYYY-MM'
   - `total_minutes_used`: Minutes used in the billing period

5. **bot_usage_tracking**
   - Tracks actual usage with `billable_minutes` per session

## The Fixed Database Function

### `check_usage_limit(p_user_id uuid, p_organization_id uuid)`

This function is the source of truth for usage limits. It returns:
- `can_record`: Whether the user can still record
- `minutes_used`: Total minutes used in current period
- `minutes_limit`: The user's limit in minutes (NULL for unlimited)
- `minutes_remaining`: Minutes left (NULL for unlimited)
- `percentage_used`: Usage percentage (0 for unlimited)
- `is_unlimited`: Boolean flag for unlimited plans

### How It Works (After Fix)

1. **Get Current Usage**: Fetches from `monthly_usage_cache` for the current month
2. **Check User Subscription First**: 
   ```sql
   SELECT plan_audio_hours_limit 
   FROM active_user_subscriptions 
   WHERE user_id = p_user_id AND status = 'active'
   ```
3. **Determine Limits**:
   - If subscription exists with `plan_audio_hours_limit = NULL` → Unlimited
   - If subscription exists with a value → Use that value × 60 (convert hours to minutes)
   - If no subscription → Fall back to organization limits
   - If no limits found → Default to 600 minutes (10 hours) for free users

## API Flow

### 1. Dashboard Page (`/dashboard`)
```typescript
// Uses the useDashboardDataWithFallback hook
const { data: dashboardData } = useDashboardDataWithFallback();
const userStats = dashboardData?.stats || null;
```

### 2. Dashboard Data API (`/api/dashboard/data`)
- Fetches sessions, stats, and subscription in parallel
- Calls `fetchUserStats` which uses the `check_usage_limit` function
- Returns consolidated data including usage limits

### 3. Stats Processing
```typescript
// The API correctly handles unlimited plans:
const isUnlimited = limitRow?.is_unlimited === true || limitRow?.minutes_limit === null;
const monthlyMinutesLimit = isUnlimited ? null : limitData.minutes_limit;
const monthlyHoursLimit = isUnlimited ? null : Math.round((limitData.minutes_limit / 60) * 10) / 10;
```

### 4. UI Component (`DashboardSidebar`)
```typescript
// Correctly displays "Unlimited" when limit is null
const isUnlimited = monthlyMinutesLimit == null || monthlyMinutesLimit >= 999999;
<span className="font-medium">
  {isUnlimited ? 'Unlimited' : `${formatMinutes(monthlyMinutesUsed)} / ${formatMinutes(monthlyMinutesLimit || 0)}`}
</span>
```

## Subscription Plans

### Current Plans in Production

1. **Max Plan**
   - `plan_name`: 'max'
   - `plan_audio_hours_limit`: NULL (unlimited)
   - Price: $99/month

2. **Pro Plan**
   - `plan_name`: 'pro'
   - `plan_audio_hours_limit`: 20
   - Price: $29/month

3. **Individual Free**
   - `plan_name`: 'individual_free'
   - `plan_audio_hours_limit`: 1
   - Price: $0

## Common Issues and Solutions

### Issue 1: User Shows Wrong Limit
**Check**: Run this query to debug
```sql
SELECT * FROM check_usage_limit(
  p_user_id := 'USER_ID_HERE',
  p_organization_id := 'ORG_ID_HERE'
);
```

**Expected Results**:
- Max plan: `is_unlimited = true`, `minutes_limit = NULL`
- Pro plan: `is_unlimited = false`, `minutes_limit = 1200`
- Free plan: `is_unlimited = false`, `minutes_limit = 60`

### Issue 2: Usage Not Updating
**Check**: Verify `monthly_usage_cache` is being updated
```sql
SELECT * FROM monthly_usage_cache
WHERE user_id = 'USER_ID' 
AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
```

### Issue 3: Subscription Not Recognized
**Check**: Verify subscription exists in active_user_subscriptions
```sql
SELECT * FROM active_user_subscriptions
WHERE user_id = 'USER_ID' AND status = 'active';
```

## Testing Different Scenarios

### Test Unlimited Plan
```sql
-- Find a Max plan user
SELECT u.email, aus.* 
FROM users u
JOIN active_user_subscriptions aus ON aus.user_id = u.id
WHERE aus.plan_name = 'max' AND aus.status = 'active'
LIMIT 1;

-- Test their limits
SELECT * FROM check_usage_limit(p_user_id := 'USER_ID', p_organization_id := 'ORG_ID');
```

### Test Limited Plans
```sql
-- Test Pro plan (20 hours)
SELECT * FROM check_usage_limit(
  p_user_id := (SELECT user_id FROM active_user_subscriptions WHERE plan_name = 'pro' LIMIT 1),
  p_organization_id := (SELECT current_organization_id FROM users WHERE id = (SELECT user_id FROM active_user_subscriptions WHERE plan_name = 'pro' LIMIT 1))
);
```

## Frontend Display Logic

### DashboardSidebar Component
- Location: `/frontend/src/components/dashboard/DashboardSidebar.tsx`
- Checks: `monthlyMinutesLimit == null || monthlyMinutesLimit >= 999999`
- Display: Shows "Unlimited" for null limits, otherwise formats as "X min / Y min"

### Usage Warning Banner
- Shows warnings at 80% and 100% usage
- Doesn't show warnings for unlimited plans
- Prompts users to upgrade when limit reached

## Important Notes

1. **Always Check Subscription First**: The function must check user subscriptions before falling back to organization limits
2. **NULL Means Unlimited**: In the database, NULL values for limits indicate unlimited usage
3. **Frontend Must Handle NULL**: The UI components must check for null/undefined and display "Unlimited"
4. **Billing Period vs Calendar Month**: The system uses billing periods from subscriptions when available, falling back to calendar months

## Debugging Commands

```bash
# Check a user's current limits
SELECT * FROM check_usage_limit(
  p_user_id := (SELECT id FROM users WHERE email = 'user@example.com'),
  p_organization_id := (SELECT current_organization_id FROM users WHERE email = 'user@example.com')
);

# Check subscription details
SELECT 
  u.email,
  aus.plan_name,
  aus.plan_display_name,
  aus.plan_audio_hours_limit,
  aus.status
FROM users u
JOIN active_user_subscriptions aus ON aus.user_id = u.id
WHERE u.email = 'user@example.com';

# Check monthly usage
SELECT * FROM monthly_usage_cache
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY month_year DESC;
```

## Migration Applied

The fix was applied using this migration:
```sql
-- Migration: fix_check_usage_limit_for_unlimited_plans
-- This updates the check_usage_limit function to properly handle unlimited plans
-- by checking user subscriptions first before falling back to organization limits
```

The key change was adding subscription checking logic that properly recognizes when `plan_audio_hours_limit` is NULL and treats it as unlimited rather than defaulting to 10 hours.