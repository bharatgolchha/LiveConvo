#!/bin/bash

# Embedding Queue Processor Runner
# This script runs the embedding processor from the frontend directory

set -e

# Change to frontend directory
cd "$(dirname "$0")/../frontend"

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Required environment variables not set"
    echo "Please set:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "You can load them from your .env.local file:"
    echo "  source .env.local && ./scripts/run-embedding-processor.sh"
    exit 1
fi

# Default values
BATCH_SIZE=${1:-5}
DELAY_MS=${2:-1000}

echo "🚀 Starting Embedding Queue Processor"
echo "📁 Working directory: $(pwd)"
echo "⚙️  Batch size: $BATCH_SIZE"
echo "⏰ Delay between batches: ${DELAY_MS}ms"
echo ""

# Run the TypeScript processor
npx tsx ../scripts/process-embedding-queue.ts "$BATCH_SIZE" "$DELAY_MS" 