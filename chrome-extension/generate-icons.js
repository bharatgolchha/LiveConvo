const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// SVG icon template with a brain circuit design
const createIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.6 / 24}, ${size * 0.6 / 24})">
    <path fill="white" d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18A2.5 2.5 0 0 0 10 15.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"/>
  </g>
</svg>
`;

// Generate icons in different sizes
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const svg = createIcon(size);
  const filename = path.join(publicDir, `icon-${size}.png`);
  
  // For now, save as SVG (in a real scenario, you'd convert to PNG)
  const svgFilename = path.join(publicDir, `icon-${size}.svg`);
  fs.writeFileSync(svgFilename, svg.trim());
  
  console.log(`Created ${svgFilename}`);
});

// Create a simple welcome.html
const welcomeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LivePrompt AI Advisor</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #3b82f6; }
    .icon { width: 128px; height: 128px; margin: 20px auto; }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <img src="public/icon-128.svg" class="icon" alt="LivePrompt AI">
  <h1>Welcome to LivePrompt AI Advisor!</h1>
  <p>Your AI-powered conversation coach is now installed and ready to help.</p>
  <p>Click the extension icon in your browser toolbar to get started.</p>
  <a href="https://liveprompt.ai/help" class="button">Learn More</a>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'welcome.html'), welcomeHtml.trim());
console.log('Created welcome.html');

console.log('\nNote: These are SVG placeholders. For production, convert to PNG format.');