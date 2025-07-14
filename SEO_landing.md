# SEO Optimization Plan for liveprompt.ai Landing Page

## Current SEO Analysis

### ✅ What's Working Well
1. **Basic Metadata Structure**: The site has a good foundation with title, description, and keywords in the layout.tsx
2. **Structured Data**: Comprehensive JSON-LD schemas including Organization, WebSite, SoftwareApplication, FAQPage
3. **Open Graph & Twitter Cards**: Basic social media tags are configured
4. **Sitemap & Robots.txt**: Automated sitemap generation is set up
5. **Mobile Responsive**: The site appears to be mobile-friendly

### ❌ Critical Issues to Fix

#### 1. **Missing Image Assets**
- `og-image.png` is referenced but doesn't exist (breaks social sharing)
- `logo.png` for structured data is missing
- No solution-specific Open Graph images

#### 2. **Title Length Issues**
- Current title: "AI Sales Coach & Meeting Assistant | Real-Time Conversation Intelligence - liveprompt.ai" (104 chars)
- Should be under 60 characters for optimal SERP display

#### 3. **Sitemap Problems**
- Including admin pages (/admin/*, /test-transcription, etc.)
- No priority settings for important pages
- Missing lastmod dates

#### 4. **Content & Keyword Optimization**
- No page-specific metadata for the landing page
- Missing long-tail keywords in content
- No internal linking strategy visible

## Proposed Optimizations

### 1. **Image Asset Creation**
I will create placeholder configurations for:
- `og-image.png` (1200x630px) - Main social sharing image
- `og-sales.png` - Sales-specific social image
- `og-recruiting.png` - Recruiting-specific social image
- `logo.png` (512x512px) - Company logo for structured data

### 2. **Metadata Optimization**

#### Layout.tsx Updates:
```typescript
// Optimized title (under 60 chars)
title: "AI Sales Coach - Real-Time Meeting Assistant | liveprompt"

// Enhanced description (under 160 chars)
description: "Close 35% more deals with AI-powered real-time conversation coaching. Works with Zoom, Meet, Teams. Start free."

// Additional keywords
keywords: [
  // Primary keywords
  'AI sales coach',
  'real-time meeting assistant',
  'conversation intelligence',
  
  // Feature keywords
  'live transcription',
  'AI meeting notes',
  'sales call coaching',
  'interview assistant',
  
  // Platform keywords
  'zoom AI assistant',
  'google meet AI',
  'teams AI coach',
  
  // Use case keywords
  'sales enablement AI',
  'recruiting AI tool',
  'client success platform'
]
```

### 3. **Landing Page Specific Metadata**
Add to page.tsx:
```typescript
export const metadata: Metadata = {
  title: 'AI Sales Coach - Turn Conversations into Conversions | liveprompt',
  description: 'Join 500+ sales leaders using AI to close 35% more deals. Real-time coaching, perfect responses, instant summaries. Start free.',
  openGraph: {
    title: 'Turn Every Conversation into Conversion with AI',
    description: 'Your AI teammate that joins meetings, remembers everything, and delivers perfect responses in real-time.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai',
  },
}
```

### 4. **Enhanced Structured Data**

#### Add to SeoJsonLd.tsx:
- **Product Schema** with pricing tiers
- **Review/Rating Schema** for testimonials
- **HowTo Schema** for the "How It Works" section
- **VideoObject Schema** for any demo videos
- **AggregateOffer** for pricing information

### 5. **Sitemap Configuration Updates**
```javascript
// next-sitemap.config.js
module.exports = {
  siteUrl: 'https://liveprompt.ai',
  generateRobotsTxt: true,
  exclude: [
    '/admin/*',
    '/api/*',
    '/auth/*',
    '/test-*',
    '/server-sitemap.xml',
    '/_*',
    '/404',
    '/500',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/', '/test-'],
      },
    ],
  },
  transform: async (config, path) => {
    // Set custom priorities
    const priorities = {
      '/': 1.0,
      '/pricing': 0.9,
      '/solutions/sales': 0.8,
      '/solutions/recruiting': 0.8,
      '/solutions/consulting': 0.8,
      '/blog': 0.7,
    };
    
    return {
      loc: path,
      changefreq: 'weekly',
      priority: priorities[path] || 0.5,
      lastmod: new Date().toISOString(),
    };
  },
}
```

### 6. **Content SEO Improvements**

#### H1-H6 Hierarchy:
- **H1**: "Turn Every Conversation into Conversion" (only one per page)
- **H2**: Major sections (How It Works, Features, Pricing, etc.)
- **H3**: Subsections and feature names
- **H4**: Minor details

#### Internal Linking:
- Add links to /solutions/sales from sales use cases
- Link to /solutions/recruiting from recruiting mentions
- Cross-link between blog and feature pages

#### Alt Text for Images:
- Product screenshots: "liveprompt AI dashboard showing real-time transcription"
- Platform logos: "Zoom integration logo"
- Feature icons: "Real-time AI guidance icon"

### 7. **Performance Optimizations**
- Implement lazy loading for below-fold images
- Optimize image sizes (use WebP format)
- Minimize JavaScript bundle size
- Add preconnect for external domains

### 8. **Local SEO Elements**
```json
{
  "@type": "Organization",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "US",
    "addressRegion": "CA" // Add actual location
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "", // Add coordinates
    "longitude": ""
  }
}
```

### 9. **Security & Trust Signals**
- Add security badges with proper schema markup
- Include customer count in hero section
- Display certifications (SOC 2) with structured data

### 10. **Call-to-Action Optimization**
- Make CTAs more specific: "Start Free Trial" → "Get 60 Free Minutes"
- Add urgency: "Join 500+ teams already using liveprompt"
- Include trust signals near CTAs

## Implementation Priority

### Phase 1 (Immediate - Critical SEO)
1. Create missing image files
2. Fix title length in layout.tsx
3. Update sitemap configuration
4. Add page-specific metadata

### Phase 2 (This Week - Content)
1. Optimize H1-H6 structure
2. Add internal linking
3. Enhance structured data
4. Add alt text to all images

### Phase 3 (Next Week - Advanced)
1. Implement performance optimizations
2. Add local SEO elements
3. Create solution-specific landing pages
4. Set up A/B testing for titles/descriptions

## Expected Results
- **Improved SERP visibility** for "AI sales coach" and related keywords
- **Higher CTR** from search results (target: 5-8%)
- **Better social sharing** appearance
- **Rich snippets** for FAQs and ratings
- **Faster page load** times

## Monitoring & Tracking
1. Set up Google Search Console
2. Monitor Core Web Vitals
3. Track keyword rankings for target terms
4. Measure organic traffic growth
5. Monitor conversion rate from organic traffic

## Next Steps
Once you approve this plan, I will:
1. Create the missing image placeholder files
2. Update all metadata configurations
3. Enhance the structured data
4. Optimize the sitemap
5. Add page-specific SEO enhancements

Would you like me to proceed with implementing these optimizations?