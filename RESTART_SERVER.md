# Restart Server Guide

## Quick Fix for Summary Generation Issues

If you're seeing "Unable to generate summary at this time" or the connection is closing unexpectedly:

### 1. Restart the Development Server

```bash
cd frontend
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 2. If Errors Persist

Run the cleanup script:
```bash
# From the project root
./fix-nextjs-errors.sh
```

### 3. Check Your Usage

The connection may close if you've reached your monthly minute limit. Check your usage at:
- Go to Settings in the app
- Look for your usage statistics

### 4. Summary Generation Issues

The summary-v2 API has been updated with:
- Better error handling
- More robust fallback when AI fails
- Improved logging to debug issues

### 5. What Was Fixed

1. **Summary API**: Updated to use `google/gemini-2.5-flash-preview-05-20` model
2. **Error Handling**: Added better fallback when AI response parsing fails
3. **Logging**: Added detailed logging to help debug issues
4. **Transcript Handling**: Improved transcript format validation
5. **Usage Tracking Bug**: Fixed issue where monthly limit was initialized to 0, causing false "limit reached" errors

### 6. If You See Console Errors

The following errors can be safely ignored:
- "A custom element with name 'autosize-textarea' has already been defined" - This is from the React DevTools
- "[Fast Refresh] rebuilding" - Normal Next.js hot reload behavior

### 7. Usage Limit Reached

If you see "Usage limit reached, stopping recording":
- **FIXED**: There was a bug where the monthly limit was initialized to 0, causing false positives
- The app now properly initializes the limit to 180 minutes (3 hours) for free plans
- If you still see this error and have minutes remaining:
  - Check your actual usage in Settings
  - Restart the development server to reload the usage data
- If you've actually used all your monthly minutes:
  - Consider upgrading your plan to get more minutes

## Need More Help?

Check the browser console for detailed error messages. The summary API now logs:
- Transcript preview
- Full API response
- Parsing status
- Fallback generation details