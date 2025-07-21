# Recall.ai Automatic Cleanup Setup

This setup creates an automated daily cleanup job that deletes Recall.ai calls (bots) older than 30 days.

## How it Works

1. **Vercel Cron Job**: Runs daily at midnight UTC
2. **API Route**: `/api/cron/cleanup-recall-calls` handles the cleanup
3. **Security**: Protected by a CRON_SECRET to prevent unauthorized access

## Setup Instructions

### 1. Add Environment Variables

Since RECALL_AI_API_KEY is already configured in your Vercel environment, you only need to add:

```bash
# Cron Secret (generate a random string)
# You can generate one with: openssl rand -base64 32
CRON_SECRET=your_random_cron_secret_here
```

### 2. Deploy to Vercel

The cron job is already configured in `vercel.json`:
- Schedule: `0 0 * * *` (runs at midnight UTC every day)
- Path: `/api/cron/cleanup-recall-calls`

### 3. Verify Setup

After deployment, you can:
1. Check Vercel dashboard → Functions → Cron tab
2. Manually trigger the cron job for testing
3. Check function logs for execution results

## Configuration

To change the retention period, modify the `DAYS_TO_KEEP` constant in:
`frontend/src/app/api/cron/cleanup-recall-calls/route.ts`

## What Gets Deleted

- All bots created more than 30 days ago
- This includes their associated recordings and transcripts

## Rate Limiting

The script respects Recall.ai's rate limits:
- 300 requests per minute per workspace
- Built-in 200ms delay between API calls

## Monitoring

The cron job logs:
- Total number of bots found
- Number of old bots to delete
- Success/failure counts
- Any errors encountered

Check Vercel function logs to monitor execution.