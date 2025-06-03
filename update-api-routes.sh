#!/bin/bash

# List of files to update
files=(
  "frontend/src/app/api/auth/clear/route.ts"
  "frontend/src/app/api/auth/onboard/route.ts"
  "frontend/src/app/api/debug-sessions/route.ts"
  "frontend/src/app/api/debug/route.ts"
  "frontend/src/app/api/documents/route.ts"
  "frontend/src/app/api/guidance/route.ts"
  "frontend/src/app/api/pricing/route.ts"
  "frontend/src/app/api/sessions/[id]/context/route.ts"
  "frontend/src/app/api/sessions/[id]/finalize/route.ts"
  "frontend/src/app/api/sessions/[id]/route.ts"
  "frontend/src/app/api/sessions/[id]/timeline/route.ts"
  "frontend/src/app/api/sessions/[id]/transcript/route.ts"
  "frontend/src/app/api/timeline/route.ts"
  "frontend/src/app/api/usage/check-limit/route.ts"
  "frontend/src/app/api/usage/current-month/route.ts"
  "frontend/src/app/api/usage/track-minute/route.ts"
  "frontend/src/app/api/users/delete-account/route.ts"
  "frontend/src/app/api/users/delete-sessions/route.ts"
  "frontend/src/app/api/users/personal-context/route.ts"
  "frontend/src/app/api/users/stats/route.ts"
  "frontend/src/app/api/users/subscription/route.ts"
  "frontend/src/app/api/waitlist/route.ts"
)

# Update imports
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Replace the import statement
    sed -i '' "s|import { supabase } from '@/lib/supabase'|import { createAuthenticatedServerClient } from '@/lib/supabase-server'|g" "$file"
    
    # Replace the auth pattern - this is more complex and needs manual review
    echo "  - Import updated. Manual review needed for auth pattern updates."
  fi
done

echo "Import statements updated. You'll need to manually update the auth patterns in each file."