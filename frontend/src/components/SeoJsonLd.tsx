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
        founder: {
          '@type': 'Person',
          name: 'Bharat Golchha',
        },
        foundingDate: '2024',
        numberOfEmployees: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 50,
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
        applicationSubCategory: 'Sales Enablement Software',
        operatingSystem: 'Web Browser',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Plan',
            price: '0',
            priceCurrency: 'USD',
            description: '60 minutes/month free forever',
            eligibleQuantity: {
              '@type': 'QuantitativeValue',
              value: 60,
              unitText: 'minutes per month'
            }
          },
          {
            '@type': 'Offer',
            name: 'Pro Plan',
            price: '29',
            priceCurrency: 'USD',
            description: '100 hours/month with advanced features',
            priceValidUntil: '2025-12-31',
            eligibleQuantity: {
              '@type': 'QuantitativeValue',
              value: 6000,
              unitText: 'minutes per month'
            }
          },
          {
            '@type': 'AggregateOffer',
            name: 'Enterprise Plan',
            priceCurrency: 'USD',
            description: 'Custom pricing for teams',
            offerCount: 1
          }
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '523',
          bestRating: '5',
          worstRating: '1',
        },
        review: [
          {
            '@type': 'Review',
            reviewRating: {
              '@type': 'Rating',
              ratingValue: '5',
              bestRating: '5'
            },
            author: {
              '@type': 'Person',
              name: 'Sarah Chen'
            },
            reviewBody: 'Onboarding new reps now takes days, not months. They can see exactly how top performers handle objections in real-time.'
          },
          {
            '@type': 'Review',
            reviewRating: {
              '@type': 'Rating',
              ratingValue: '5',
              bestRating: '5'
            },
            author: {
              '@type': 'Person',
              name: 'Marcus Johnson'
            },
            reviewBody: 'I catch inconsistencies I would have missed before. The AI suggestions for behavioral questions are game-changing.'
          }
        ],
        featureList: [
          'Real-time AI conversation coaching',
          'Live transcription with speaker identification',
          'Automated meeting summaries and action items',
          'CRM integration (Salesforce, HubSpot)',
          'Works with Zoom, Google Meet, Microsoft Teams',
          'AI-powered objection handling',
          'Interview assistance and behavioral questions',
          'Previous conversation context',
          'SOC 2 Type II compliant',
          'GDPR compliant',
          'End-to-end encryption',
          'Zero data retention policy',
          '<2 second response time',
          'Meeting bot for automatic recording',
          'Export to PDF/Word/Email',
          'Team analytics dashboard'
        ],
        screenshot: [
          {
            '@type': 'ImageObject',
            url: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/1.png',
            caption: 'Live transcription interface'
          },
          {
            '@type': 'ImageObject',
            url: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/2.png',
            caption: 'AI guidance panel'
          }
        ],
        softwareVersion: '2.0',
        datePublished: '2024-01-15',
        dateModified: '2025-01-14',
        provider: {
          '@id': 'https://liveprompt.ai/#organization'
        }
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
      {
        '@type': 'HowTo',
        '@id': 'https://liveprompt.ai/#howto',
        name: 'How to use liveprompt.ai for better sales calls',
        description: 'Simple 3-step process to transform your conversations with AI coaching',
        image: {
          '@type': 'ImageObject',
          url: 'https://liveprompt.ai/og-image.png'
        },
        totalTime: 'PT2M',
        estimatedCost: {
          '@type': 'MonetaryAmount',
          currency: 'USD',
          value: '0'
        },
        supply: [],
        tool: [],
        step: [
          {
            '@type': 'HowToStep',
            name: 'Connect',
            text: 'Works instantly with Zoom, Meet, Teams - no downloads or plugins required. Just open liveprompt.ai in your browser alongside your video call.',
            image: {
              '@type': 'ImageObject',
              url: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/1.png'
            }
          },
          {
            '@type': 'HowToStep',
            name: 'Converse',
            text: 'AI listens and provides real-time coaching only you can see. Get perfect responses, objection handling, and next questions suggested instantly.',
            image: {
              '@type': 'ImageObject',
              url: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/2.png'
            }
          },
          {
            '@type': 'HowToStep',
            name: 'Close',
            text: 'Get action items and CRM-ready summaries automatically. All meeting notes, commitments, and next steps captured and formatted for you.',
            image: {
              '@type': 'ImageObject',
              url: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/4.png'
            }
          }
        ]
      },
      {
        '@type': 'Product',
        '@id': 'https://liveprompt.ai/#product',
        name: 'liveprompt.ai Pro',
        description: 'Professional AI conversation coaching for sales teams',
        brand: {
          '@id': 'https://liveprompt.ai/#organization'
        },
        offers: {
          '@type': 'Offer',
          price: '29',
          priceCurrency: 'USD',
          priceValidUntil: '2025-12-31',
          availability: 'https://schema.org/InStock',
          seller: {
            '@id': 'https://liveprompt.ai/#organization'
          }
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '523'
        }
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