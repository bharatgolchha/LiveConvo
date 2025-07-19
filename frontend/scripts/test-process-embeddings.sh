#!/bin/bash

# Test script for process-embeddings edge function
# Usage: ./test-process-embeddings.sh

# You need to set the service role key from your .env.local file
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreGp5Y2NjaWZ3eXhndHZmbHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTUzMzY0NSwiZXhwIjoyMDY3MTA5NjQ1fQ.zW0ARxRafI8kyx-N5PNXRI2jH6JGNHQsCA9MubwU4cw"

echo "🚀 Testing process-embeddings edge function..."
echo "📝 Processing batch of 5 embeddings..."

curl -X POST \
  'https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/process-embeddings' \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"batchSize": 5}' \
  --verbose

echo -e "\n\n✅ Test complete!"