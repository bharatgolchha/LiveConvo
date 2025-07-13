# Database Migration Scripts

This directory contains SQL migration scripts to synchronize the Production database schema with the Development database schema.

## Migration Order

Execute the migrations in the following order:

1. **001_create_referral_event_type_enum.sql**
   - Creates the `referral_event_type` enum required for audit logging
   - Must be run before creating the referral_audit_logs table

2. **002_create_custom_reports_table.sql**
   - Creates the `custom_reports` table for storing user-generated reports
   - Includes RLS policies for security

3. **003_create_email_notifications_table.sql**
   - Creates the `email_notifications` table for tracking sent emails
   - Includes status tracking and automatic timestamp updates

4. **004_create_user_preferences_table.sql**
   - Creates the `user_preferences` table for notification settings
   - Automatically creates preferences for new users via trigger

5. **005_create_referral_audit_logs_table.sql**
   - Creates comprehensive audit logging for the referral system
   - Requires the `referral_event_type` enum from migration 001

6. **006_migrate_user_referrals_table.sql**
   - **CRITICAL**: Aligns the `user_referrals` table schema
   - Handles column renames and data type changes
   - Contains commented-out destructive operations for safety

7. **007_create_referral_functions.sql**
   - Creates missing referral system functions
   - Includes event logging and code generation functions

8. **008_handle_new_user_function.sql**
   - Creates/updates the `handle_new_user` trigger function
   - Ensures consistent user initialization

9. **009_optional_cleanup_prod_specific.sql**
   - **OPTIONAL**: Contains cleanup for Prod-specific features
   - All destructive operations are commented out by default
   - Review carefully before uncommenting any sections

## Important Notes

### Before Running Migrations

1. **Backup your production database** before running any migrations
2. Test all migrations in a staging environment first
3. Review each migration file, especially those with data modifications
4. Pay special attention to migration 006 which modifies existing data

### Data Safety

- Migration 006 contains column renames that preserve data
- Destructive operations are commented out for safety
- The `referral_fraud_checks` table from Prod is preserved by default
- Extra columns in Prod's `user_referrals` table are kept for compatibility

### Post-Migration Verification

After running the migrations:

1. Verify all tables were created successfully
2. Check that existing data in `user_referrals` was preserved
3. Test the referral system functionality
4. Verify email notifications can be created
5. Ensure user preferences are created for new signups
6. Check that custom reports can be generated

### Rollback Plan

If issues occur:

1. Restore from the pre-migration backup
2. Individual migrations can be reversed by:
   - Dropping newly created tables
   - Reverting column changes in `user_referrals`
   - Removing newly added functions

## Migration Commands

Using Supabase CLI:
```bash
# Apply a single migration
supabase db push --file migrations/001_create_referral_event_type_enum.sql

# Or apply all migrations in order
for file in migrations/*.sql; do
  echo "Applying $file..."
  supabase db push --file "$file"
done
```

Using direct connection:
```bash
# Connect to production database and run migrations
psql -h <host> -U <user> -d <database> -f migrations/001_create_referral_event_type_enum.sql
```

## Schema Differences Summary

### New Tables Added to Prod:
- `custom_reports` - Custom report generation
- `email_notifications` - Email tracking
- `user_preferences` - Notification preferences
- `referral_audit_logs` - Comprehensive audit trail

### Modified Tables:
- `user_referrals` - Column names aligned with Dev schema

### New Functions Added:
- `complete_referral` - Marks referrals as completed
- `generate_referral_code` - Creates unique codes
- `log_referral_event` - Audit logging
- `process_referral_code` - Validates referral codes

### Preserved Prod Features:
- `referral_fraud_checks` table (Prod-specific)
- Additional Stripe-related columns in `user_referrals`
- Prod-specific referral functions