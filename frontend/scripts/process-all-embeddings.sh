#!/bin/bash

# Process all embeddings in batches
# Usage: ./process-all-embeddings.sh

SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreGp5Y2NjaWZ3eXhndHZmbHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTUzMzY0NSwiZXhwIjoyMDY3MTA5NjQ1fQ.zW0ARxRafI8kyx-N5PNXRI2jH6JGNHQsCA9MubwU4cw"
EDGE_FUNCTION_URL="https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/process-embeddings"
BATCH_SIZE=10
TOTAL_PROCESSED=0

echo "🚀 Starting to process all pending embeddings..."
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
    echo "Response: $RESPONSE"
    
    TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
    
    # Return the number processed
    return $PROCESSED
}

# Main loop
while true; do
    process_batch
    LAST_BATCH=$?
    
    if [ $LAST_BATCH -eq 0 ]; then
        echo ""
        echo "✨ No more pending embeddings to process!"
        break
    fi
    
    echo "⏳ Waiting 2 seconds before next batch..."
    sleep 2
    echo ""
done

echo ""
echo "🎉 Finished processing embeddings!"
echo "📊 Total processed: $TOTAL_PROCESSED embeddings"
echo ""
echo "💡 Next steps:"
echo "1. Check the embedding queue status in Supabase SQL Editor:"
echo "   SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;"
echo ""
echo "2. Verify embeddings were generated:"
echo "   SELECT COUNT(*) FROM sessions WHERE title_embedding IS NOT NULL;"
echo "   SELECT COUNT(*) FROM summaries WHERE content_embedding IS NOT NULL;"
echo ""
echo "3. Test RAG search in the meeting page!"