import React from 'react';

/**
 * Enhanced SeoJsonLd component with comprehensive structured data for improved SEO.
 * Includes Organization, WebSite, FAQPage, SoftwareApplication, and BreadcrumbList schemas.
 */
const SeoJsonLd: React.FC = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://liveprompt.ai/#organization',
        name: 'liveprompt.ai',
        alternateName: 'LivePrompt AI',
        url: 'https://liveprompt.ai/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://liveprompt.ai/logo.png',
          width: 512,
          height: 512,
        },
        sameAs: [
          'https://twitter.com/livepromptai',
          'https://www.linkedin.com/company/liveprompt',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'hello@liveprompt.ai',
          contactType: 'customer support',
          availableLanguage: ['English'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://liveprompt.ai/#website',
        url: 'https://liveprompt.ai/',
        name: 'liveprompt.ai',
        description: 'AI-powered real-time conversation intelligence platform for sales, recruiting, and consulting professionals',
        publisher: {
          '@id': 'https://liveprompt.ai/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://liveprompt.ai/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://liveprompt.ai/#software',
        name: 'liveprompt.ai',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: '14-day free trial',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '523',
          bestRating: '5',
          worstRating: '1',
        },
        featureList: [
          'Real-time AI conversation coaching',
          'Automated meeting summaries',
          'CRM integration',
          'Works with Zoom, Google Meet, Teams',
          'Objection handling prompts',
          'Interview assistance',
          'SOC 2 compliant',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://liveprompt.ai/#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://liveprompt.ai/',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://liveprompt.ai/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does liveprompt.ai work during my calls?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'liveprompt.ai runs silently in your browser alongside any video platform. It provides real-time AI suggestions visible only to you, helping you navigate conversations with confidence.',
            },
          },
          {
            '@type': 'Question',
            name: 'What makes this different from note-taking tools?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Unlike passive note-takers, liveprompt.ai actively coaches you during conversations with real-time guidance, objection handling, and next-best-question suggestions.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is my conversation data secure?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. We use bank-level encryption, are SOC 2 compliant, and process data in real-time with zero retention after your session ends.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which platforms does it support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Works with Zoom, Google Meet, Teams, and any browser-based video platform. No plugins or downloads required.',
            },
          },
          {
            '@type': 'Question',
            name: 'How much does liveprompt.ai cost?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'liveprompt.ai offers a 14-day free trial with full access to all features. After the trial, plans start at competitive rates. Visit our pricing page for current options.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I use liveprompt.ai for hiring interviews?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! liveprompt.ai helps hiring managers conduct better interviews with AI-powered follow-up questions, red flag detection, and automated candidate summaries.',
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};

export default SeoJsonLd;