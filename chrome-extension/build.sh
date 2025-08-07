#!/bin/bash

# Build script for LivePrompt Chrome Extension

echo "🚀 Building LivePrompt Chrome Extension for production..."

# Clean and recreate build directory
rm -rf build
mkdir -p build

# Copy all files to build directory
cp -r assets build/
cp -r background build/
cp -r content-scripts build/
cp -r sidepanel build/
cp -r images build/
cp manifest.production.json build/manifest.json

# Remove development files if any
find build -name "*.dev.js" -type f -delete
find build -name ".DS_Store" -type f -delete

# Update service worker to use production URLs (already done)
echo "✅ Files copied to build directory"

# Create a zip file for Chrome Web Store
cd build
zip -r ../liveprompt-extension.zip . -x "*.DS_Store" "*/.DS_Store"
cd ..

echo "✅ Created liveprompt-extension.zip"

# Cleanup
# rm -rf build

echo "🎉 Build complete! Upload liveprompt-extension.zip to Chrome Web Store"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Create a new item or update existing"
echo "3. Upload liveprompt-extension.zip"
echo "4. Fill in store listing information"
echo "5. Upload screenshots and promotional images"
echo "6. Submit for review"