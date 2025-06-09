#!/bin/bash
# Quick rollback script to revert to old routes

# Revert dashboard to use old route
sed -i '' 's|/conversation/|/app?cid=|g' src/app/dashboard/page.tsx

echo "✅ Rolled back to old /app route"
echo "Restart your dev server to apply changes"