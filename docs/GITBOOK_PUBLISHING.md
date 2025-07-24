# GitBook Publishing Guide

This guide explains how to publish the LivePrompt.ai documentation to GitBook.

## Prerequisites

- GitBook account (create at https://www.gitbook.com)
- Git repository access
- Documentation files ready in the `docs/` folder

## Method 1: GitHub Integration (Recommended)

### Step 1: Push Documentation to GitHub
```bash
# Add all documentation files
git add docs/

# Commit the documentation
git commit -m "Add comprehensive help documentation for LivePrompt.ai"

# Push to your repository
git push origin master
```

### Step 2: Connect GitBook to GitHub
1. Log in to [GitBook](https://app.gitbook.com)
2. Create a new space or select existing one
3. Go to Space Settings → Integrations
4. Click "GitHub" and authenticate
5. Select your repository and branch
6. Map the `docs/` folder as the root directory

### Step 3: Configure Sync Settings
- Enable "Sync direction: GitHub to GitBook"
- Set branch to `master` (or your default branch)
- Enable "Auto-sync on push"

## Method 2: GitBook CLI (Alternative)

### Installation
```bash
# Install GitBook CLI globally
npm install -g gitbook-cli

# Install GitBook
gitbook install
```

### Build and Preview Locally
```bash
# Navigate to docs directory
cd docs/

# Install plugins
gitbook install

# Build the book
gitbook build

# Serve locally for preview
gitbook serve
# Visit http://localhost:4000
```

### Publish to GitBook
```bash
# Build the static site
gitbook build

# The built files will be in _book/ directory
# Upload these to GitBook manually or via Git
```

## Method 3: Direct GitBook Editor

1. Create a new space in GitBook
2. Use the GitBook editor to:
   - Import markdown files
   - Or copy-paste content
   - Organize using the file tree

## GitBook Configuration

### Space Settings
1. **Visibility**: Public or Private
2. **Custom Domain**: docs.liveprompt.ai (optional)
3. **Search**: Enable for better navigation
4. **Analytics**: Add tracking code if needed

### Customization
1. **Theme**: Choose color scheme
2. **Logo**: Upload LivePrompt.ai logo
3. **Favicon**: Add custom favicon
4. **Navigation**: Configure header/footer links

## File Structure for GitBook

```
docs/
├── README.md                 # Home page
├── SUMMARY.md               # Table of contents
├── .gitbook.yaml            # GitBook configuration
├── book.json                # Legacy configuration (optional)
├── getting-started/         # Section folder
│   ├── quick-start.md
│   ├── account-setup.md
│   ├── requirements.md
│   └── first-conversation.md
├── features/                # Section folder
│   ├── overview.md
│   └── ...
└── ...                      # Other sections
```

## Important Files

### SUMMARY.md
This file defines the navigation structure. GitBook uses it to generate the sidebar.

### .gitbook.yaml
Configuration file for GitBook v2. Specifies:
- Root directory
- Structure files
- Redirects

### book.json
Legacy configuration for GitBook CLI. Includes:
- Plugins
- Theme settings
- Custom styling

## Publishing Checklist

- [ ] All markdown files are properly formatted
- [ ] SUMMARY.md includes all pages
- [ ] Internal links use relative paths
- [ ] Images are in a dedicated folder
- [ ] No broken links
- [ ] Configuration files are set up
- [ ] Test locally before publishing

## Updating Documentation

### For GitHub Integration
1. Edit markdown files locally
2. Commit and push changes
3. GitBook auto-syncs within minutes

### For Direct Editing
1. Use GitBook's online editor
2. Changes are published immediately
3. Can export changes back to Git

## Custom Domain Setup

To use docs.liveprompt.ai:
1. Go to Space Settings → Domains
2. Add custom domain
3. Add CNAME record in your DNS:
   ```
   docs.liveprompt.ai → your-space.gitbook.io
   ```
4. Enable HTTPS in GitBook

## Troubleshooting

### Sync Issues
- Check GitHub integration permissions
- Verify webhook is active
- Check for merge conflicts

### Build Errors
- Validate markdown syntax
- Check for special characters in filenames
- Ensure all linked files exist

### Display Issues
- Clear GitBook cache
- Check browser compatibility
- Verify custom CSS isn't breaking layout

## Best Practices

1. **Version Control**: Always use Git for documentation
2. **Review Process**: Preview changes before publishing
3. **Consistent Style**: Follow markdown style guide
4. **Regular Updates**: Keep docs in sync with product
5. **User Feedback**: Add feedback widget to pages

## Additional Resources

- [GitBook Documentation](https://docs.gitbook.com)
- [Markdown Guide](https://www.markdownguide.org)
- [GitBook Troubleshooting](https://docs.gitbook.com/troubleshooting)

---

For questions about documentation, contact the LivePrompt.ai team.