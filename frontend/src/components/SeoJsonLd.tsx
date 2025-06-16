import React from 'react';

/**
 * SeoJsonLd component injects structured data via JSON-LD <script> tag.
 * This improves SEO by helping search engines understand the site content
 * and enables rich results (Organization, WebSite, FAQPage).
 */
const SeoJsonLd: React.FC = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://liveprompt.ai/#organization',
        name: 'LivePrompt',
        url: 'https://liveprompt.ai/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://liveprompt.ai/logo.png',
        },
        sameAs: [
          'https://twitter.com/livepromptai',
          'https://www.linkedin.com/company/liveprompt',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://liveprompt.ai/#website',
        url: 'https://liveprompt.ai/',
        name: 'LivePrompt',
        publisher: {
          '@id': 'https://liveprompt.ai/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://liveprompt.ai/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      // FAQ structured data (excerpt)
      {
        '@type': 'FAQPage',
        '@id': 'https://liveprompt.ai/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I get selected for early access?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We review applications weekly and prioritize users who can provide detailed feedback. Sales professionals, consultants, and hiring managers get priority.',
            },
          },
          {
            '@type': 'Question',
            name: 'Will my prospect hear anything?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Completely silent to others. Only you see the cues on your screen.',
            },
          },
          {
            '@type': 'Question',
            name: 'What languages do you support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'English, Spanish, French, German, and Portuguese with 95%+ accuracy.',
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