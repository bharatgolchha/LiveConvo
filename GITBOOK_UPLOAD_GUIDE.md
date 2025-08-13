# How to Upload Documentation to GitBook

## Prerequisites
- GitBook account (free at gitbook.com)
- The `liveprompt-user-docs.zip` file

## Method 1: GitHub Integration (Recommended)

### Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com) and create a new repository
   - Name: `liveprompt-docs` (or your preference)
   - Make it public or private
   - Don't initialize with README (we have our own)

### Step 2: Upload Docs to GitHub
```bash
# Extract the zip file
unzip liveprompt-user-docs.zip
cd temp-docs-export

# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial documentation upload"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/liveprompt-docs.git
git push -u origin main
```

### Step 3: Connect GitBook to GitHub
1. Log in to [GitBook](https://app.gitbook.com)
2. Click "New" → "Import from Git"
3. Choose "GitHub"
4. Authorize GitBook to access your GitHub
5. Select your `liveprompt-docs` repository
6. Choose the branch (main)
7. Click "Import"

### Step 4: Configure Sync
- Enable "Sync with GitHub" for automatic updates
- Choose sync direction:
  - **GitHub → GitBook** (recommended): GitHub is source of truth
  - **Bi-directional**: Edit in both places
  - **GitBook → GitHub**: GitBook is source of truth

---

## Method 2: Direct GitBook Upload

### Step 1: Create New Space
1. Log in to [GitBook](https://app.gitbook.com)
2. Click "New" → "New Space"
3. Choose "Start from scratch"
4. Name it "LivePrompt.ai Documentation"

### Step 2: Import Files
1. In your new GitBook space, click "⋮" (more options) in sidebar
2. Select "Import" → "Upload files"
3. Extract `liveprompt-user-docs.zip` on your computer
4. Select all files from the extracted folder
5. Drag and drop into GitBook
6. GitBook will process and create the structure

### Step 3: Verify Structure
- Check that SUMMARY.md created the navigation
- Verify all pages are accessible
- Test internal links

---

## Method 3: GitBook CLI (Advanced)

### Step 1: Install GitBook CLI
```bash
npm install -g gitbook-cli
```

### Step 2: Prepare Documentation
```bash
# Extract documentation
unzip liveprompt-user-docs.zip
cd temp-docs-export

# Initialize GitBook
gitbook init

# Build locally to test
gitbook serve
# Visit http://localhost:4000 to preview
```

### Step 3: Push to GitBook
```bash
# Install GitBook Desktop or use web interface
# Create new space and connect to local folder
```

---

## Method 4: GitBook Desktop App

### Step 1: Download GitBook Desktop
- Download from [desktop.gitbook.com](https://desktop.gitbook.com)
- Install and log in

### Step 2: Create Space
1. Click "Create new space"
2. Choose "Import existing content"
3. Select the extracted `temp-docs-export` folder
4. GitBook will sync automatically

---

## Post-Upload Configuration

### 1. Customize Appearance
- **Settings** → **Customize**
- Add logo
- Choose theme colors
- Set font preferences

### 2. Configure Domain
- **Settings** → **Domain**
- Use GitBook subdomain: `your-org.gitbook.io`
- Or add custom domain: `docs.liveprompt.ai`

### 3. Set Permissions
- **Settings** → **Share**
- Public: Anyone can view
- Private: Invite-only
- Password protected option

### 4. Enable Features
- **Search**: Automatically indexed
- **AI Search**: Enable for smart search
- **Version Control**: Track changes
- **Comments**: Allow feedback

### 5. Add Integrations
- **Google Analytics**: Track visitors
- **Intercom**: Add chat support
- **Slack**: Notifications
- **Custom scripts**: Add tracking/widgets

---

## Recommended Setup for LivePrompt.ai

### Optimal Configuration:
1. **Use GitHub Integration** for version control
2. **Set up custom domain**: `docs.liveprompt.ai`
3. **Make public** for user access
4. **Enable AI search** for better discovery
5. **Add your logo and brand colors**

### Suggested Structure:
```
docs.liveprompt.ai/
├── Introduction (README.md)
├── Getting Started/
│   ├── Quick Start ⭐
│   ├── Account Setup
│   ├── Requirements
│   └── First Conversation
├── Features/
│   ├── Overview
│   ├── Nova Advisor ⭐
│   ├── Real-time Transcription ⭐
│   ├── Meeting Agendas ⭐
│   ├── Meeting Linking ⭐
│   └── (other features)
├── User Guide/
│   └── Complete Guide
├── Troubleshooting/
│   └── FAQ
└── API Reference/
    └── (future API docs)
```

### SEO Optimization:
1. Add meta descriptions to each page
2. Use clear, descriptive titles
3. Include keywords naturally
4. Add alt text to images
5. Create a sitemap

---

## Quick Start (Fastest Method)

If you want to get started immediately:

1. **Extract the zip**:
   ```bash
   unzip liveprompt-user-docs.zip
   ```

2. **Go to GitBook.com**:
   - Sign up/Log in
   - Click "New" → "New Space"
   - Click "Import" → "Upload files"
   - Select all files from extracted folder
   - Drop them in

3. **Done!** Your docs are live

---

## Troubleshooting

### "SUMMARY.md not creating navigation"
- Ensure SUMMARY.md is in root directory
- Check markdown formatting is correct
- Try "Refresh" in GitBook settings

### "Images not showing"
- Upload images to GitBook's asset manager
- Update image paths in markdown
- Use relative paths

### "Custom domain not working"
- Add CNAME record in your DNS
- Point to: `hosting.gitbook.io`
- Wait for DNS propagation (up to 48h)

### "Sync not working with GitHub"
- Check GitBook has repo permissions
- Verify branch name is correct
- Check for merge conflicts

---

## Best Practices

1. **Version Control**: Always use Git integration
2. **Backup**: Keep local copies of docs
3. **Review**: Test all links after upload
4. **Analytics**: Monitor what users search for
5. **Feedback**: Enable comments for improvements
6. **Updates**: Regular sync from development

---

## Support Resources

- **GitBook Documentation**: [docs.gitbook.com](https://docs.gitbook.com)
- **GitBook Community**: [community.gitbook.com](https://community.gitbook.com)
- **GitBook Status**: [status.gitbook.com](https://status.gitbook.com)
- **Contact Support**: support@gitbook.com

---

*Your documentation will be live in minutes! The GitBook platform handles all the hosting, search, and formatting automatically.*