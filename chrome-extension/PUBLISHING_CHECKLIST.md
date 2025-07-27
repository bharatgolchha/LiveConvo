# Chrome Extension Publishing Checklist

## Pre-Publishing Checklist

### 1. Code Preparation ✅
- [x] Remove all localhost references from manifest.json
- [x] Update all API URLs to production (https://liveprompt.ai)
- [x] Remove console.log statements (or wrap in production check)
- [x] Test with production API endpoints
- [ ] Minify JavaScript files (optional)
- [x] Ensure all permissions are justified and minimal

### 2. Required Assets 📸
- [ ] Extension Icon - 128x128px PNG
- [ ] Screenshot 1 - 1280x800 or 640x400 (Popup view)
- [ ] Screenshot 2 - 1280x800 or 640x400 (Meeting with widget)
- [ ] Screenshot 3 - 1280x800 or 640x400 (AI suggestions)
- [ ] Screenshot 4 - 1280x800 or 640x400 (Summary view)
- [ ] Screenshot 5 - 1280x800 or 640x400 (Login screen)
- [ ] Small Promo Tile - 440x280 PNG
- [ ] Large Promo Tile - 920x680 PNG (optional)
- [ ] Marquee Promo Tile - 1400x560 PNG (optional)

### 3. Store Listing Information ✅
- [x] Extension name (45 characters max)
- [x] Short description (132 characters max)
- [x] Detailed description (formatted with features, benefits)
- [x] Category selection (Productivity)
- [x] Primary language (English)
- [x] Support email
- [x] Website URL
- [x] Privacy policy URL

### 4. Developer Account Setup 📝
- [ ] Create Chrome Web Store developer account
- [ ] Pay one-time $5 developer registration fee
- [ ] Verify account email
- [ ] Set up payment profile (if planning paid features)

### 5. Privacy & Compliance 🔒
- [x] Privacy policy created and hosted
- [x] Terms of service available
- [x] GDPR compliance statement
- [x] Ensure manifest permissions match actual usage
- [ ] Add privacy policy link to extension (in popup)

### 6. Testing Checklist ✓
- [ ] Test on Chrome stable version
- [ ] Test on Chrome beta (optional)
- [ ] Test all authentication flows
- [ ] Test on all supported platforms (Meet, Teams, Zoom)
- [ ] Test error handling (offline, auth failures)
- [ ] Test with multiple user accounts
- [ ] Verify no memory leaks
- [ ] Check performance impact

### 7. Build & Package 📦
- [x] Run build script: `./build.sh`
- [ ] Verify ZIP file contents
- [ ] Check ZIP file size (< 50MB)
- [ ] Test installing from ZIP locally

## Publishing Steps

### 1. Chrome Web Store Developer Dashboard
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with Google account
3. Pay $5 registration fee (first time only)

### 2. Create New Item
1. Click "New Item" button
2. Upload liveprompt-extension.zip
3. Wait for initial validation

### 3. Fill Store Listing
1. Add all screenshots (drag in order)
2. Copy content from STORE_LISTING.md
3. Select category: Productivity
4. Add promotional images
5. Set visibility (Public)

### 4. Privacy Tab
1. Paste privacy policy from PRIVACY_POLICY.md
2. Explain each permission usage:
   - Storage: Save auth tokens
   - ActiveTab: Detect meeting pages
   - Scripting: Inject UI components
   - Cookies: Sync web sessions

### 5. Pricing & Distribution
1. Select regions (all countries)
2. Set as free (no in-app purchases)
3. Agree to developer terms

### 6. Submit for Review
1. Review all information
2. Click "Submit for Review"
3. Wait 1-3 business days

## Post-Publishing

### Monitoring
- [ ] Set up error reporting
- [ ] Monitor user reviews
- [ ] Track installation metrics
- [ ] Set up support channel

### Updates
- [ ] Plan regular updates
- [ ] Maintain changelog
- [ ] Test updates thoroughly
- [ ] Communicate changes to users

### Marketing
- [ ] Add extension link to website
- [ ] Create documentation
- [ ] Announce on social media
- [ ] Email existing users

## Important URLs
- Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Publishing Docs: https://developer.chrome.com/docs/webstore/publish
- Program Policies: https://developer.chrome.com/docs/webstore/program-policies
- Best Practices: https://developer.chrome.com/docs/webstore/best-practices

## Support Contacts
- Chrome Web Store Support: https://support.google.com/chrome_webstore
- Developer Forum: https://groups.google.com/a/chromium.org/g/chromium-extensions

## Version History
- v1.0.0 - Initial release (January 2025)