# Database Schema Differences Report: Dev vs Prod

## Overview
This report details the schema differences between the Development (ucvfgfbjcrxbzppwjpuu) and Production (xkxjycccifwyxgtvflxz) databases for the LiveConvo project.

## 1. Tables Existing Only in One Environment

### Tables in Dev but NOT in Prod (4 tables):

#### 1.1 `custom_reports`
- **Purpose**: Stores custom generated reports for sessions
- **Schema**:
  ```sql
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
  session_id          UUID NOT NULL (FK to sessions)
  user_id             UUID NOT NULL (FK to users)
  prompt              TEXT NOT NULL
  template            VARCHAR(100) DEFAULT 'custom'
  generated_content   TEXT
  metadata            JSONB DEFAULT '{}'
  created_at          TIMESTAMPTZ DEFAULT now()
  updated_at          TIMESTAMPTZ DEFAULT now()
  ```
- **Indexes**:
  - Primary key on `id`
  - Index on `session_id`
  - Index on `user_id`
  - Index on `created_at DESC`

#### 1.2 `email_notifications`
- **Purpose**: Tracks email notifications sent to users
- **Schema**:
  ```sql
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  session_id        UUID NOT NULL (FK to sessions)
  user_id           UUID NOT NULL (FK to users)
  email_type        VARCHAR(50) NOT NULL
  recipient_email   VARCHAR(255) NOT NULL
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
  error_message     TEXT
  sent_at           TIMESTAMPTZ
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  ```
- **Indexes**:
  - Primary key on `id`
  - Index on `session_id`
  - Index on `user_id`
  - Index on `email_type`
  - Index on `status`

#### 1.3 `referral_audit_logs`
- **Purpose**: Comprehensive audit trail for referral system events
- **Schema**:
  ```sql
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_type       referral_event_type NOT NULL (custom enum)
  user_id          UUID (FK to users)
  referrer_id      UUID (FK to users)
  referee_id       UUID (FK to users)
  referral_id      UUID (FK to user_referrals)
  referral_code    VARCHAR(10)
  ip_address       INET
  user_agent       TEXT
  device_id        VARCHAR(255)
  event_data       JSONB DEFAULT '{}'
  error_message    TEXT
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  ```
- **Indexes**:
  - Primary key on `id`
  - Index on `user_id`
  - Index on `referrer_id`
  - Index on `event_type`
  - Index on `referral_code`
  - Index on `created_at DESC`

#### 1.4 `user_preferences`
- **Purpose**: Stores user notification preferences
- **Schema**:
  ```sql
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id                       UUID NOT NULL UNIQUE (FK to users)
  email_notifications_enabled   BOOLEAN DEFAULT true
  email_post_call_summary       BOOLEAN DEFAULT true
  email_weekly_digest           BOOLEAN DEFAULT false
  email_important_insights      BOOLEAN DEFAULT true
  created_at                    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  updated_at                    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  ```
- **Indexes**:
  - Primary key on `id`
  - Unique index on `user_id`
  - Index on `user_id`

### Tables in Prod but NOT in Dev (1 table):

#### 1.5 `referral_fraud_checks`
- **Purpose**: Tracks potential fraud attempts in the referral system
- **Schema**:
  ```sql
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           UUID (FK to users)
  device_id         TEXT
  ip_address        INET
  card_fingerprint  TEXT
  check_type        VARCHAR(50)
  flagged           BOOLEAN DEFAULT false
  created_at        TIMESTAMPTZ DEFAULT now()
  ```
- **Indexes**:
  - Primary key on `id`
  - Index on `device_id`
  - Index on `ip_address`
  - Index on `card_fingerprint`

## 2. Schema Differences in Common Tables

### 2.1 `users` table
- **Status**: IDENTICAL in both environments
- All 27 columns match exactly in both Dev and Prod

### 2.2 `subscriptions` table
- **Status**: IDENTICAL in both environments
- All 16 columns match exactly in both Dev and Prod

### 2.3 `user_referrals` table
- **Status**: SIGNIFICANTLY DIFFERENT between environments

#### Dev Schema:
```sql
id                        UUID PRIMARY KEY
referrer_id               UUID NOT NULL
referee_id                UUID NOT NULL
referee_email             VARCHAR(255) NOT NULL
status                    referral_status NOT NULL DEFAULT 'pending'
created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
completed_at              TIMESTAMPTZ
reward_amount             NUMERIC DEFAULT 5.00
discount_percentage       INTEGER DEFAULT 10
ip_address                INET
device_id                 VARCHAR(255)
stripe_customer_id        VARCHAR(255)
stripe_payment_intent_id  VARCHAR(255)
metadata                  JSONB DEFAULT '{}'
```

#### Prod Schema:
```sql
id                         UUID PRIMARY KEY
referrer_user_id           UUID NOT NULL  -- Different column name!
referee_user_id            UUID           -- Different column name! Also nullable
referral_code              VARCHAR(10) NOT NULL  -- New column
status                     referral_status DEFAULT 'pending'
reward_amount              NUMERIC DEFAULT 5.00
referee_discount_percent   INTEGER DEFAULT 10  -- Different column name!
referee_discount_applied   BOOLEAN DEFAULT false  -- New column
device_id                  TEXT  -- Different data type!
ip_address                 INET
created_at                 TIMESTAMPTZ DEFAULT now()
completed_at               TIMESTAMPTZ
rewarded_at                TIMESTAMPTZ  -- New column
first_payment_id           TEXT  -- New column
stripe_coupon_id           TEXT  -- New column
stripe_checkout_session_id TEXT  -- New column
```

**Key Differences**:
- Column naming: `referrer_id` vs `referrer_user_id`, `referee_id` vs `referee_user_id`
- Missing in Prod: `referee_email`, `stripe_customer_id`, `stripe_payment_intent_id`, `metadata`
- New in Prod: `referral_code`, `referee_discount_applied`, `rewarded_at`, `first_payment_id`, `stripe_coupon_id`, `stripe_checkout_session_id`
- Data type differences: `device_id` is VARCHAR(255) in Dev but TEXT in Prod

## 3. Enum Type Differences

### Dev has:
- `referral_event_type` enum with 13 values:
  - link_clicked, code_validated, code_invalid, signup_attempted, signup_completed, 
  - self_referral_blocked, payment_completed, credit_scheduled, credit_granted, 
  - credit_failed, refund_processed, fraud_detected, error
- `referral_status` enum with 4 values: pending, completed, rewarded, expired

### Prod has:
- `referral_status` enum with 4 values: pending, completed, rewarded, expired (same as Dev)
- **Missing**: `referral_event_type` enum

## 4. Function Differences

### Dev Functions (6 total):
1. `complete_referral(p_referee_id UUID, p_payment_intent_id TEXT)` - Updates referral status
2. `generate_referral_code()` - Generates 6-character codes
3. `generate_user_referral_code()` - Trigger function
4. `handle_new_user()` - Trigger for new user setup
5. `log_referral_event(...)` - Comprehensive event logging (uses referral_audit_logs table)
6. `process_referral_code(...)` - Processes referral codes with fraud checks

### Prod Functions (4 total):
1. `check_referral_limits(p_referrer_id UUID, p_ip_address INET, p_device_id TEXT)` - Rate limiting
2. `generate_referral_code(p_user_id UUID)` - Different signature, uses user initials
3. `handle_new_user_referral()` - Different implementation
4. `process_referral_code(...)` - Different implementation with fraud checks

**Key Function Differences**:
- Dev has more comprehensive logging via `log_referral_event`
- Prod has dedicated rate limiting function `check_referral_limits`
- Different approaches to code generation (Dev: random, Prod: user initials + random)
- Both environments handle fraud differently (Dev: logs to audit table, Prod: logs to fraud_checks table)

## 5. Critical Issues to Address

1. **user_referrals table incompatibility**: The schema differences are significant and would require data migration
2. **Missing audit trail in Prod**: No `referral_audit_logs` table means less visibility into referral system activity
3. **Missing email notification tracking in Prod**: No way to track sent emails
4. **Missing custom reports in Prod**: Feature not available in production
5. **Missing user preferences in Prod**: No way to manage notification preferences
6. **Different fraud detection approaches**: Dev uses audit logs, Prod uses dedicated fraud_checks table

## 6. Recommendations

1. **Immediate Actions**:
   - Create missing tables in Prod: `custom_reports`, `email_notifications`, `user_preferences`
   - Create `referral_audit_logs` table and `referral_event_type` enum in Prod
   - Align `user_referrals` table schema between environments

2. **Migration Strategy**:
   - For `user_referrals`: Create migration script to rename columns and add missing fields
   - Ensure all referral-related functions are consistent between environments
   - Add missing indexes from Dev to Prod

3. **Testing Requirements**:
   - Test referral system thoroughly after schema alignment
   - Verify email notification features work in Prod
   - Test custom report generation in Prod
   - Ensure user preferences are properly saved and retrieved

4. **Long-term**:
   - Implement a proper database migration system
   - Use version control for database schema
   - Automate schema comparison in CI/CD pipeline