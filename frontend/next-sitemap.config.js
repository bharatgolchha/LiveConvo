module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://liveprompt.ai',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 7000,
  exclude: [
    '/admin/*',
    '/api/*',
    '/auth/*',
    '/test-*',
    '/server-sitemap.xml',
    '/_*',
    '/404',
    '/500',
    '/dashboard/*',
    '/conversation/*',
    '/summary/*',
    '/session/*',
    '/onboarding/*',
    '/settings/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/test-',
          '/dashboard/',
          '/conversation/',
          '/summary/',
          '/session/',
          '/onboarding/',
          '/settings/',
        ],
      },
    ],
    additionalSitemaps: [
      'https://liveprompt.ai/sitemap.xml',
    ],
  },
  transform: async (config, path) => {
    // Set custom priorities based on page importance
    const priorities = {
      '/': 1.0,
      '/pricing': 0.9,
      '/solutions': 0.8,
      '/solutions/sales': 0.8,
      '/solutions/recruiting': 0.8,
      '/solutions/consulting': 0.8,
      '/about': 0.7,
      '/blog': 0.7,
      '/contact': 0.6,
      '/terms': 0.5,
      '/privacy': 0.5,
    };
    
    // Set changefreq based on page type
    const changefreq = {
      '/': 'daily',
      '/pricing': 'weekly',
      '/blog': 'weekly',
    };
    
    return {
      loc: path,
      changefreq: changefreq[path] || 'monthly',
      priority: priorities[path] || 0.5,
      lastmod: new Date().toISOString(),
    };
  },
}; 