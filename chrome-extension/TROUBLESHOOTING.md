# Chrome Extension Loading Troubleshooting

## ✅ Fixed Issues

### Issue: "Could not load background script"
**Cause**: The manifest.json had incorrect paths with "dist/" prefix
**Solution**: Removed "dist/" prefix from all paths in manifest.json since it's already in the dist folder

### Issue: Missing icon files
**Cause**: Manifest references PNG files but we only have SVG
**Solution**: Created copies of SVG files with .png extension (temporary fix)

## 🚀 How to Load the Extension Now

1. **Build the extension** (already done):
```bash
cd chrome-extension
npm run build
```

2. **Load in Chrome**:
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **"Load unpacked"**
   - Select the `dist` folder (NOT the chrome-extension folder)
   - Path should be: `/Users/bharatgolchha/CursorProjects/LiveConvo/chrome-extension/dist`

3. **Verify it loaded**:
   - You should see "LivePrompt AI Advisor" in the extensions list
   - No errors should appear
   - The extension icon should appear in the toolbar

## 🔍 If You Still Get Errors

### Check the Console
1. After loading, look for a "Errors" button on the extension card
2. Click it to see detailed error messages
3. Common issues:
   - **Manifest parsing error**: Check JSON syntax
   - **File not found**: Verify all referenced files exist in dist/
   - **Permission errors**: Some permissions need user interaction

### Verify File Structure
The `dist` folder should contain:
```
dist/
├── manifest.json
├── background/
│   └── service-worker.js
├── popup/
│   ├── index.html
│   └── popup.js
├── sidebar/
│   ├── index.html
│   └── sidebar.js
├── content/
│   └── inject.js
├── public/
│   ├── icon-16.png (and .svg)
│   ├── icon-32.png (and .svg)
│   ├── icon-48.png (and .svg)
│   └── icon-128.png (and .svg)
├── 515.css
├── 815.js
└── 920.js
```

### Common Chrome Issues

1. **Cache Issues**:
   - Remove the extension
   - Restart Chrome
   - Re-add the extension

2. **Conflicting Extensions**:
   - Try disabling other extensions
   - Test in a new Chrome profile

3. **Chrome Version**:
   - Ensure Chrome is updated
   - Manifest V3 requires Chrome 88+

## 🎯 Quick Debug Commands

Run these in Chrome DevTools console (on any page):

```javascript
// Check if extension is installed
chrome.management.getAll(exts => {
  const liveprompt = exts.find(e => e.name.includes('LivePrompt'));
  console.log('Extension found:', liveprompt);
});

// Check extension ID (after loading)
chrome.runtime.id
```

## 📝 Next Steps After Loading

1. **Click the extension icon** - Should show login popup
2. **Pin the extension** - Click puzzle piece → Pin LivePrompt AI
3. **Check background page** - chrome://extensions → "service worker"
4. **Test on a meeting site** - Visit meet.google.com

## 🚨 Emergency Fixes

If nothing works:

1. **Clean rebuild**:
```bash
rm -rf dist
npm run build
```

2. **Check Node/npm versions**:
```bash
node --version  # Should be 16+
npm --version   # Should be 7+
```

3. **Reinstall dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

The extension should now load successfully! 🎉