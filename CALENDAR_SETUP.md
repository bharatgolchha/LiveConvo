# Calendar Integration Setup Guide

This guide will help you set up the calendar integration for liveprompt.ai.

## Prerequisites

- Google Cloud Console account
- Recall.ai account
- Access to your Supabase project

## Step 1: Google OAuth Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "LivePrompt Calendar")
4. Click "Create"

### 1.2 Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 1.3 Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure consent screen first:
   - User Type: External
   - App name: LivePrompt AI
   - User support email: your email
   - Developer contact: your email
4. Application type: "Web application"
5. Name: "LivePrompt Web Client"
6. Authorized redirect URIs - Add both:
   ```
   http://localhost:3000/api/calendar/auth/google/callback
   https://app.liveprompt.ai/api/calendar/auth/google/callback
   ```
7. Click "Create"
8. **Save the Client ID and Client Secret**

### 1.4 Configure OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Click "Edit App"
3. Add scopes:
   - Click "Add or Remove Scopes"
   - Select:
     - `.../auth/calendar.events.readonly`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
4. Add test users (your email) while in development
5. Submit for verification when ready for production

## Step 2: Recall.ai Setup

### 2.1 Create Recall.ai Account

1. Sign up at [Recall.ai](https://www.recall.ai/)
2. Complete onboarding

### 2.2 Get API Credentials

1. Go to Dashboard → API Keys
2. Create a new API key
3. **Save the API key**

### 2.3 Configure Webhooks

1. Go to Dashboard → Webhooks
2. Add webhook endpoint:
   - Development: `http://localhost:3000/api/calendar/webhooks/recall`
   - Production: `https://app.liveprompt.ai/api/calendar/webhooks/recall`
3. Generate and **save the webhook secret**

## Step 3: Environment Configuration

### 3.1 Update .env.local

Copy the calendar example and fill in your values:

```bash
cp .env.local.calendar.example .env.local.calendar
```

Edit `.env.local` and add:

```env
# Recall.ai API
RECALL_AI_API_KEY=your_recall_api_key_here
RECALL_AI_REGION=us-west-2
RECALL_WEBHOOK_SECRET=your_webhook_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/auth/google/callback

# Calendar Features
NEXT_PUBLIC_CALENDAR_ENABLED=true
NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED=true
```

### 3.2 Restart Development Server

```bash
npm run dev
```

## Step 4: Testing the Integration

### 4.1 Connect Calendar

1. Go to Dashboard → Settings → Calendar
2. Click "Connect Google Calendar"
3. Authorize the app
4. You should see your calendar connected

### 4.2 Verify Events Sync

1. Check if your upcoming meetings appear on the dashboard
2. Try clicking "Join" on a meeting
3. Verify session is created with meeting context

### 4.3 Test Webhook Updates

1. Create/modify an event in Google Calendar
2. Check if it appears/updates in the dashboard
3. Check webhook logs in Supabase:
   ```sql
   SELECT * FROM calendar_webhooks ORDER BY created_at DESC LIMIT 10;
   ```

## Step 5: Production Deployment

### 5.1 Update Environment Variables

In your production environment (Vercel/etc), add:

```env
RECALL_AI_API_KEY=your_production_key
RECALL_WEBHOOK_SECRET=your_production_secret
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_secret
GOOGLE_REDIRECT_URI=https://app.liveprompt.ai/api/calendar/auth/google/callback
NEXT_PUBLIC_APP_URL=https://app.liveprompt.ai
```

### 5.2 Update Google OAuth

1. In Google Cloud Console, add production redirect URI:
   ```
   https://app.liveprompt.ai/api/calendar/auth/google/callback
   ```

### 5.3 Update Recall.ai Webhooks

Add production webhook URL:
```
https://app.liveprompt.ai/api/calendar/webhooks/recall
```

## Troubleshooting

### Common Issues

1. **"Google OAuth not configured" error**
   - Check GOOGLE_CLIENT_ID is set in .env.local
   - Restart the development server

2. **OAuth redirect mismatch**
   - Ensure redirect URI in Google Console matches exactly
   - Include trailing slashes if needed

3. **Webhooks not working**
   - Check RECALL_WEBHOOK_SECRET is set
   - Verify webhook URL is accessible
   - Check Supabase logs for errors

4. **No meetings showing**
   - Manually sync calendar (click sync button)
   - Check browser console for errors
   - Verify Recall.ai calendar was created

### Debug Commands

Check if calendar tables exist:
```sql
SELECT * FROM calendar_connections WHERE user_id = 'your-user-id';
SELECT * FROM calendar_events ORDER BY start_time DESC LIMIT 10;
SELECT * FROM calendar_webhooks ORDER BY created_at DESC LIMIT 10;
```

## Security Considerations

1. **Never commit API keys** to git
2. **Use different keys** for development and production
3. **Rotate keys regularly**
4. **Monitor webhook logs** for suspicious activity
5. **Implement rate limiting** for production

## Next Steps

1. **Test with real meetings** to ensure smooth UX
2. **Set up monitoring** for webhook failures
3. **Add error tracking** (Sentry, etc.)
4. **Plan for Outlook integration** (Phase 2)

## Support

For issues:
1. Check webhook logs in Supabase
2. Review API logs in Recall.ai dashboard
3. Check browser console for frontend errors
4. Review server logs for API errors

---

**Note**: This setup typically takes 30-45 minutes. Take your time with each step to ensure proper configuration.