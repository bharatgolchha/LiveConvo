#!/bin/bash

# Finish processing remaining embeddings
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreGp5Y2NjaWZ3eXhndHZmbHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTUzMzY0NSwiZXhwIjoyMDY3MTA5NjQ1fQ.zW0ARxRafI8kyx-N5PNXRI2jH6JGNHQsCA9MubwU4cw"
EDGE_FUNCTION_URL="https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/process-embeddings"

echo "🚀 Finishing remaining embeddings..."

# Process 3 more batches of 10 each
for i in 1 2 3; do
    echo ""
    echo "📦 Processing batch $i of 3..."
    
    curl -s -X POST "$EDGE_FUNCTION_URL" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H 'Content-Type: application/json' \
        -d '{"batchSize": 10}' | jq .
    
    if [ $i -lt 3 ]; then
        echo "⏳ Waiting 2 seconds..."
        sleep 2
    fi
done

echo ""
echo "✅ Done! RAG search should now be working in production!"