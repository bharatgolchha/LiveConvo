#!/bin/bash

echo "🧹 Cleaning Next.js build artifacts..."

# Stop any running dev server
echo "⏹️  Stopping any running dev servers..."
pkill -f "next dev" || true

# Clean all caches
echo "🗑️  Removing .next directory..."
rm -rf .next

echo "🗑️  Removing node_modules cache..."
rm -rf node_modules/.cache

echo "🗑️  Removing Next.js cache..."
rm -rf .next-cache

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Cleanup complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"