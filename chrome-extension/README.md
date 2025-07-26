# LivePrompt Chrome Extension

A Chrome extension that integrates LivePrompt AI conversation coaching with popular video conferencing platforms.

## Features

- 🎯 **Quick Meeting Access**: View and join upcoming meetings from the extension popup
- 🚀 **One-Click Session Start**: Start LivePrompt sessions directly from Meet/Teams/Zoom
- 🎨 **Floating Widget**: Non-intrusive floating button on video platforms
- 📋 **Manual Meeting Management**: Add and manage meetings manually (Phase 1)
- 🔒 **Secure Authentication**: Login with your LivePrompt account

## Supported Platforms

- Google Meet
- Microsoft Teams
- Zoom Web Client

## Installation (Development)

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` directory
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the LivePrompt extension icon in your toolbar
2. Sign in with your LivePrompt account
3. Add meetings manually or view your scheduled meetings
4. Join a meeting on Meet/Teams/Zoom
5. Look for the floating LivePrompt button
6. Click to start a coaching session

## Development

### Project Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background/           # Background scripts
├── content-scripts/      # Platform-specific injectors
├── popup/               # Extension popup UI
├── components/          # Shared components
└── assets/             # Icons and styles
```

### API Configuration

Update the API base URL in:
- `background/service-worker.js`
- `background/api-client.js`

For local development: `http://localhost:3000/api`
For production: `https://liveprompt.ai/api`

### Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the LivePrompt extension card
4. Test on supported video platforms

### Building for Production

1. Replace placeholder icons in `assets/icons/` with actual PNG files
2. Update API URLs to production endpoints
3. Test thoroughly on all platforms
4. Create a ZIP file of the extension directory
5. Upload to Chrome Web Store

## Phase 1 Features (MVP)

- ✅ Manual meeting management
- ✅ Basic authentication
- ✅ Floating widget on video platforms
- ✅ Session start/stop functionality
- ✅ Chrome storage for persistence

## Future Enhancements (Phase 2+)

- 📅 Google Calendar integration
- 🎙️ Real-time transcription display
- 🤖 AI guidance panel
- 🔔 Pre-meeting notifications
- 📊 Session analytics

## Troubleshooting

### Extension not loading
- Check that Developer mode is enabled
- Verify manifest.json is valid JSON
- Check browser console for errors

### Widget not appearing
- Ensure you're in an active meeting (not lobby)
- Refresh the meeting page
- Check content script console for errors

### Authentication issues
- Verify API endpoint is accessible
- Check network tab for failed requests
- Ensure credentials are correct

## License

Proprietary - LivePrompt AI