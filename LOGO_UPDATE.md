# Logo Update Summary - Brandmark Implementation

## Logo URLs
- **Dark Mode**: `https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png`
- **Light Mode**: `https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//light.png`

## Implementation Details
The new logos are brandmarks (icon only) with 1:1 aspect ratio. Text is displayed separately using Poppins Bold font where needed.

## Locations Updated

### Brandmark + Text (Landing/Marketing Pages)
1. **Landing page** (/frontend/src/app/landing/page.tsx)
   - Header: Brandmark + "liveprompt.ai" text
   - Footer: Brandmark + "liveprompt.ai" text
   
2. **Main page** (/frontend/src/app/page.tsx)
   - Header: Brandmark + "liveprompt.ai" text
   - Footer: Brandmark + "liveprompt.ai" text
   
3. **Login page** (/frontend/src/app/auth/login/page.tsx)
   - Brandmark + "liveprompt.ai" text

### Brandmark Only (App Pages)
1. **Dashboard** (/frontend/src/app/dashboard/page.tsx)
   - Theme-aware brandmark only (no text)
   
2. **Pricing page** (/frontend/src/app/pricing/page.tsx)
   - Theme-aware brandmark only (no text)

## Key Implementation Details

### Font Setup
- Added Poppins font import in layout.tsx
- Font weights: 400, 500, 600, 700
- Applied using CSS variable: `fontFamily: 'var(--font-poppins)'`

### Brandmark + Text Pattern
```jsx
<Link href="/" className="flex items-center gap-2">
  <img 
    src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
    alt="liveprompt.ai logo"
    className="w-8 h-8 object-contain"
  />
  <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-poppins)', color: '#ffffff' }}>
    liveprompt.ai
  </span>
</Link>
```

### Theme-Aware Brandmark Only
```jsx
<img 
  src={theme === 'dark' 
    ? "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
    : "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//light.png"
  }
  alt="liveprompt.ai"
  className="w-8 h-8 object-contain"
/>
```

## Styling Details
- Brandmark size: 32x32px (w-8 h-8) for standard headers
- Brandmark size: 48x48px (w-12 h-12) for login page
- Text styling: Poppins Bold, text-xl (20px)
- Text color: #ffffff for dark backgrounds
- Gap between logo and text: 8px (gap-2)