#!/bin/bash

# Process all embeddings in dev environment
# Usage: ./process-dev-embeddings.sh

SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdmZnZmJqY3J4YnpwcHdqcHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODMzNTcxOSwiZXhwIjoyMDYzOTExNzE5fQ.x0ztUzlDO4lVLT3CeQ_iNruRHLySST70DqlU9hcVrQA"
EDGE_FUNCTION_URL="https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/process-embeddings"
BATCH_SIZE=10
TOTAL_PROCESSED=0

echo "🚀 Starting to process all pending embeddings in DEV environment..."
echo "📊 Batch size: $BATCH_SIZE"
echo ""

# Function to process a batch
process_batch() {
    echo "🔄 Processing batch..."
    
    RESPONSE=$(curl -s -X POST "$EDGE_FUNCTION_URL" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H 'Content-Type: application/json' \
        -d "{\"batchSize\": $BATCH_SIZE}")
    
    # Extract processed count using grep and awk
    PROCESSED=$(echo "$RESPONSE" | grep -o '"processed":[0-9]*' | awk -F: '{print $2}')
    ERRORS=$(echo "$RESPONSE" | grep -o '"errors":[0-9]*' | awk -F: '{print $2}')
    
    if [ -z "$PROCESSED" ]; then
        echo "❌ Error: Could not parse response"
        echo "Response: $RESPONSE"
        return 1
    fi
    
    echo "✅ Batch complete: $PROCESSED processed, $ERRORS errors"
    
    TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
    
    # Return the number processed
    return $PROCESSED
}

# Main loop - process up to 5 batches (50 embeddings total)
BATCH_COUNT=0
MAX_BATCHES=5

while [ $BATCH_COUNT -lt $MAX_BATCHES ]; do
    process_batch
    LAST_BATCH=$?
    
    BATCH_COUNT=$((BATCH_COUNT + 1))
    
    if [ $LAST_BATCH -eq 0 ]; then
        echo ""
        echo "✨ No more pending embeddings to process!"
        break
    fi
    
    if [ $BATCH_COUNT -lt $MAX_BATCHES ]; then
        echo "⏳ Waiting 2 seconds before next batch..."
        sleep 2
        echo ""
    fi
done

echo ""
echo "🎉 Finished processing dev embeddings!"
echo "📊 Total processed: $TOTAL_PROCESSED embeddings"
echo ""
echo "💡 To check status, you can run:"
echo "psql $DATABASE_URL -c \"SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;\""