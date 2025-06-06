# Email Setup Guide for LivePrompt.ai

## Setting up Resend for Waitlist Invites

### 1. Sign up for Resend

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email address

### 2. Get Your API Key

1. Log into your Resend dashboard
2. Go to **API Keys** section
3. Create a new API key
4. Copy the API key (starts with `re_`)

### 3. Add Environment Variable

Add this to your `.env.local` file (create it if it doesn't exist):

```bash
# Resend Email API Key
RESEND_API_KEY=re_your_api_key_here
```

### 4. Verify Domain (For Production)

For production use, you'll need to verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `liveprompt.ai`)
4. Add the provided DNS records to your domain
5. Wait for verification

**For development:** You can use Resend's sandbox mode with any email address.

### 5. Update the Email Template

In `/api/admin/waitlist/[id]/invite/route.ts`, update:

```javascript
from: 'LivePrompt.ai <noreply@yourdomain.com>', // Replace with your domain
```

### 6. Test the Setup

1. Go to `/admin/waitlist` in your app
2. Approve a waitlist entry
3. Click "Send Invite"
4. Check if the email is sent successfully

### Current Features

✅ **HTML Email Template** with beautiful design
✅ **Personalized Content** with user's name
✅ **Call-to-Action Button** linking to signup
✅ **Error Handling** and logging
✅ **Graceful Fallback** when email isn't configured

### Alternative Email Services

If you prefer other services:

- **SendGrid**: Great for high volume
- **Mailgun**: Developer-friendly
- **AWS SES**: Cost-effective for scale
- **Postmark**: Excellent for transactional emails

### Troubleshooting

- **API Key not working**: Check it starts with `re_` and is from Resend
- **Domain not verified**: Use sandbox mode for testing
- **Emails not sending**: Check server logs for error messages
- **Emails in spam**: Verify your domain and set up SPF/DKIM

### Next Steps

1. Set up domain verification for production
2. Customize the email template with your branding
3. Add email analytics tracking
4. Set up automated follow-up sequences 