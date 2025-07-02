# Recall.ai Recording Scripts

This directory contains scripts for checking and managing Recall.ai bot recordings.

## Scripts

### 1. check-bot-recording.ts
Simple script to check a Recall.ai bot and display recording information without modifying any data.

**Usage:**
```bash
RECALL_API_KEY=your_recall_api_key npx tsx scripts/check-bot-recording.ts
```

**What it does:**
- Fetches bot details from Recall.ai API
- Shows bot status and history
- Displays recording availability and URLs
- Provides SQL for manual database updates

### 2. check-and-store-recording.ts
Comprehensive script that checks a Recall.ai bot and automatically stores the recording in the database.

**Usage:**
```bash
# Requires both Recall.ai and Supabase credentials
RECALL_API_KEY=your_recall_api_key \
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key \
npx tsx scripts/check-and-store-recording.ts
```

**What it does:**
- Fetches bot details with recordings
- Extracts video and transcript URLs
- Stores recording data in `bot_recordings` table
- Updates session with recording information
- Shows session details after update

## Configuration

Both scripts check for bot ID: `43dc791e-9346-4935-9463-baed699ac9ce`

### Environment Variables

- `RECALL_API_KEY` or `RECALL_AI_API_KEY` - Your Recall.ai API key (required)
- `RECALL_REGION` or `RECALL_AI_REGION` - Recall.ai region (default: us-west-2)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (required for check-and-store-recording.ts)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL (default: production URL)

## Database Tables

The scripts interact with these tables:
- `bot_recordings` - Stores recording metadata and URLs
- `sessions` - Updates session with recording information

## Recording States

Recordings can have the following status codes:
- `processing` - Recording is being processed
- `done` - Recording is complete and available
- `failed` - Recording failed
- `deleted` - Recording was deleted

## Notes

1. Recordings may take several minutes to process after a meeting ends
2. Recording URLs expire (check `expires_at` field)
3. The scripts use the production database by default
4. Always check bot status history if recordings are missing

## Example Output

```
🔍 Checking Recall.ai bot: 43dc791e-9346-4935-9463-baed699ac9ce
📡 Using region: us-west-2

✅ Bot found!
📊 Bot Details:
  Status: done
  Meeting URL: https://meet.google.com/abc-defg-hij
  Session ID: 123e4567-e89b-12d3-a456-426614174000

📹 Recording 1:
  ID: 987e6543-e21b-12d3-a456-426614174000
  Status: done
  ✅ Video: Available

🎬 Video URL:
https://recall-recording-media.s3.amazonaws.com/...
```