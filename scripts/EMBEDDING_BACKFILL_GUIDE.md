# Embedding Backfill Guide

This guide explains how to generate embeddings for existing sessions and summaries on the production server.

## Overview

The embedding backfill system consists of two main components:

1. **Database Migration** - Queues existing records for embedding generation
2. **Processing Script** - Processes the queue and generates embeddings

## Current Status

As of the last backfill run, we have:
- ✅ **33 sessions** queued for embedding generation
- ✅ **22 summaries** queued for embedding generation
- ✅ **55 total records** in the embedding queue

## Processing the Queue

### Prerequisites

1. **Environment Variables**: Ensure you have the following environment variables set:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_API_BASE_URL=your_api_base_url
   ```

2. **Dependencies**: Make sure you're in the frontend directory with all dependencies installed:
   ```bash
   cd frontend
   npm install
   ```

### Running the Processor

#### Option 1: Using the Bash Script (Recommended)

```bash
# Load environment variables and run with default settings
source frontend/.env.local && ./scripts/run-embedding-processor.sh

# Custom batch size and delay
source frontend/.env.local && ./scripts/run-embedding-processor.sh 10 2000
```

#### Option 2: Direct TypeScript Execution

```bash
cd frontend
npx tsx ../scripts/process-embedding-queue.ts [batch_size] [delay_ms]
```

### Parameters

- **batch_size** (default: 5): Number of records to process in parallel
- **delay_ms** (default: 1000): Delay between batches in milliseconds

### Example Output

```
🚀 Starting Embedding Queue Processor
📁 Working directory: /path/to/frontend
⚙️  Batch size: 5
⏰ Delay between batches: 1000ms

Processing batch of 5 items...
Processing sessions record abc123...
Generated embedding with 1536 dimensions
✅ Completed sessions record abc123
...

=== PROCESSING SUMMARY ===
Total records processed: 55
Total errors: 0
Success rate: 100.0%
```

## Monitoring Progress

### Check Queue Status

You can check the current queue status using Supabase:

```sql
SELECT 
    table_name,
    status,
    COUNT(*) as count
FROM embedding_queue 
GROUP BY table_name, status
ORDER BY table_name, status;
```

### Check Embedding Status

Verify embeddings have been generated:

```sql
-- Sessions with embeddings
SELECT 
    COUNT(*) as total_sessions,
    COUNT(title_embedding) as sessions_with_embeddings,
    COUNT(*) - COUNT(title_embedding) as sessions_missing_embeddings
FROM sessions 
WHERE deleted_at IS NULL;

-- Summaries with embeddings  
SELECT 
    COUNT(*) as total_summaries,
    COUNT(content_embedding) as summaries_with_embeddings,
    COUNT(*) - COUNT(content_embedding) as summaries_missing_embeddings
FROM summaries 
WHERE deleted_at IS NULL;
```

## Troubleshooting

### Common Issues

1. **API Rate Limits**: If you hit rate limits, increase the delay between batches
2. **Memory Issues**: Reduce batch size if processing large content
3. **Network Timeouts**: The script includes retry logic and error handling

### Error Recovery

Failed items are marked as 'failed' in the queue with error messages. You can:

1. Check failed items:
   ```sql
   SELECT * FROM embedding_queue WHERE status = 'failed';
   ```

2. Retry failed items by updating their status:
   ```sql
   UPDATE embedding_queue 
   SET status = 'pending', error_message = NULL 
   WHERE status = 'failed';
   ```

### Manual Requeue

If you need to requeue specific records:

```sql
-- Requeue a specific session
INSERT INTO embedding_queue (table_name, record_id, content, embedding_column, user_id)
SELECT 'sessions', id, title, 'title_embedding', user_id
FROM sessions 
WHERE id = 'your_session_id'
ON CONFLICT (table_name, record_id, embedding_column) 
DO UPDATE SET status = 'pending';
```

## Performance Considerations

- **Batch Size**: Start with 5, increase if no rate limiting issues
- **Delay**: 1000ms is conservative, can reduce to 500ms if stable
- **Parallel Processing**: Each batch processes items in parallel
- **API Costs**: Each embedding generation costs ~$0.0001 (OpenAI text-embedding-3-small)

## Next Steps

1. **Monitor the first run** to ensure everything works smoothly
2. **Set up automated processing** for future records (triggers are already in place)
3. **Consider background job processing** for production environments

## File Structure

```
scripts/
├── process-embedding-queue.ts     # Main processing script
├── run-embedding-processor.sh     # Bash wrapper script
└── EMBEDDING_BACKFILL_GUIDE.md   # This documentation
```

## API Endpoints Used

- `POST /api/embeddings/generate` - Generates embeddings for content
- Supabase direct database access for queue management

---

**Note**: The database migration has already been run and all existing records are queued. You only need to run the processing script to generate the actual embeddings. 