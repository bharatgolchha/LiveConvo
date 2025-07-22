import Script from 'next/script'
import { BlogPostMeta } from '@/types/blog'

interface BlogJsonLdProps {
  post: BlogPostMeta
  url: string
}

export function BlogJsonLd({ post, url }: BlogJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: `https://liveprompt.ai/og-image-default.jpg`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: post.author.social?.linkedin || post.author.social?.twitter || 'https://liveprompt.ai',
      jobTitle: post.author.role,
    },
    publisher: {
      '@type': 'Organization',
      name: 'LivePrompt.ai',
      logo: {
        '@type': 'ImageObject',
        url: 'https://liveprompt.ai/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: post.tags.join(', '),
    articleSection: post.category,
    wordCount: post.content?.split(' ').length || 1000,
  }

  return (
    <Script
      id={`blog-jsonld-${post.slug}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd),
      }}
      strategy="afterInteractive"
    />
  )
}

export function BlogListingJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'LivePrompt.ai Blog',
    description: 'Insights on AI, sales, productivity, and real-time conversation intelligence.',
    url: 'https://liveprompt.ai/blog',
    publisher: {
      '@type': 'Organization',
      name: 'LivePrompt.ai',
      logo: {
        '@type': 'ImageObject',
        url: 'https://liveprompt.ai/logo.png',
      },
    },
  }

  return (
    <Script
      id="blog-listing-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd),
      }}
      strategy="afterInteractive"
    />
  )
}