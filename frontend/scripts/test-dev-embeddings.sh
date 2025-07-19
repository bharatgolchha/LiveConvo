#!/bin/bash

# Test script for dev process-embeddings edge function
# Usage: ./test-dev-embeddings.sh

# Dev service role key from .env.local
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdmZnZmJqY3J4YnpwcHdqcHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODMzNTcxOSwiZXhwIjoyMDYzOTExNzE5fQ.x0ztUzlDO4lVLT3CeQ_iNruRHLySST70DqlU9hcVrQA"

echo "🚀 Testing dev process-embeddings edge function..."
echo "📝 Processing batch of 5 embeddings..."

curl -X POST \
  'https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/process-embeddings' \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"batchSize": 5}' \
  --verbose

echo -e "\n\n✅ Test complete!"