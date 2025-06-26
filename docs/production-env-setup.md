# Production Environment Setup Guide

## 🎉 Production Database Successfully Created!

Your production database has been successfully created and configured with all necessary tables, relationships, and security policies.

### Production Database Details

- **Project ID**: `juuysuamfoteblrqqdnu`
- **URL**: `https://juuysuamfoteblrqqdnu.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YWNiem1rYmJodHV2dmJzY3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTkwMjQsImV4cCI6MjA2NTYzNTAyNH0.qzb4ufGObX_MpRf7cUt7LYA7JPnHA_ondjIUqtMr9zE`

## 📋 What Was Created

✅ **Complete Schema**: All 20 tables successfully migrated
- Core tables: users, organizations, sessions, transcripts, summaries, documents
- Billing tables: plans, subscriptions, usage_tracking, monthly_usage_cache
- Support tables: templates, guidance, system_logs, session_context
- Special tables: prep_checklist, beta_waitlist, subscription_events

✅ **Row-Level Security**: RLS policies enabled on all user data tables

✅ **Default Plans**: Free and Pro plans seeded with correct pricing

✅ **Database Functions**: Usage tracking and billing functions created

✅ **Edge Functions Deployed**: All 4 edge functions successfully deployed
- **`stripe-webhooks`** - Handles Stripe webhook events for subscription management
- **`create-checkout-session`** - Creates Stripe checkout sessions for subscriptions  
- **`create-portal-session`** - Creates Stripe billing portal sessions
- **`test-stripe-config`** - Tests Stripe configuration and validates price IDs

## 🔗 Production Edge Function URLs

Your production edge functions are now available at:

- **Stripe Webhooks**: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/stripe-webhooks`
- **Create Checkout**: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/create-checkout-session`
- **Billing Portal**: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/create-portal-session`
- **Test Stripe Config**: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/test-stripe-config`

## 🔧 Production Environment Variables

Create these environment variables in your Vercel production deployment:

### Required Variables

```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://juuysuamfoteblrqqdnu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YWNiem1rYmJodHV2dmJzY3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTkwMjQsImV4cCI6MjA2NTYzNTAyNH0.qzb4ufGObX_MpRf7cUt7LYA7JPnHA_ondjIUqtMr9zE

# Get this from Supabase Dashboard > Settings > API
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key_here

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_API_URL=https://your-production-domain.com/api
NODE_ENV=production
NEXT_PUBLIC_ENV=production
```

## 🚀 Next Steps for Production Deployment

### 1. Get Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/juuysuamfoteblrqqdnu)
2. Navigate to Settings > API
3. Copy the `service_role` key (starts with `eyJ...`)
4. Add it as `SUPABASE_SERVICE_ROLE_KEY` in your production environment

### 2. Configure Authentication
1. In Supabase Dashboard > Authentication > Settings
2. Set your production domain in "Site URL"
3. Configure OAuth providers (Google, etc.) with production URLs
4. Update redirect URLs to point to your production domain

### 3. Set up Stripe Production
1. Switch to your Stripe live/production keys
2. Update webhook endpoints to point to your production domain
3. Test payment flows with production keys

### 4. Deploy to Vercel
1. Set all environment variables in Vercel dashboard
2. Deploy your frontend with production configuration
3. Test database connectivity and all features

### 5. Configure Edge Functions (if any)
If you have Supabase Edge Functions, deploy them to production:
```bash
supabase functions deploy --project-ref juuysuamfoteblrqqdnu
```

### 6. Set up Monitoring
1. Configure database monitoring in Supabase Dashboard
2. Set up alerting for critical issues
3. Consider adding application monitoring (Sentry, etc.)

### 7. Database Backup
1. Configure automated backups in Supabase Dashboard
2. Test backup restoration process
3. Set up backup monitoring

## 🔍 Verification Checklist

After deployment, verify:
- [ ] Database connectivity works
- [ ] User authentication works
- [ ] Sessions can be created and managed
- [ ] Billing/subscription flows work
- [ ] File uploads work (if applicable)
- [ ] Real-time features work
- [ ] All API endpoints respond correctly

## 🆘 Troubleshooting

### Common Issues
1. **Connection Issues**: Verify environment variables are set correctly
2. **Auth Issues**: Check Site URL and OAuth redirect URLs
3. **RLS Issues**: Ensure users have proper organization membership
4. **Billing Issues**: Verify Stripe webhook endpoints and keys

### Getting Help
- Check Supabase logs in the Dashboard
- Review application logs in Vercel
- Test with development environment first

## 📊 Database Schema Summary

Your production database includes:
- **User Management**: Complete user profiles and organization membership
- **Session Management**: Recording, transcription, and real-time guidance
- **Billing System**: Plans, subscriptions, and usage tracking
- **Content Management**: Documents, templates, and summaries
- **Security**: Row-level security protecting all user data

The production database is now ready for deployment! 🎉 