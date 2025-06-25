import { Metadata } from 'next'
import { supportSolutionData } from '@/data/solutions/support'

export const metadata: Metadata = {
  title: supportSolutionData.metaTitle,
  description: supportSolutionData.metaDescription,
  keywords: supportSolutionData.keywords.join(', '),
  openGraph: {
    title: supportSolutionData.metaTitle,
    description: supportSolutionData.metaDescription,
    type: 'website',
    url: 'https://liveprompt.ai/solutions/support',
    images: [
      {
        url: 'https://liveprompt.ai/og-support.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai for Customer Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: supportSolutionData.metaTitle,
    description: supportSolutionData.metaDescription,
    images: ['https://liveprompt.ai/og-support.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai/solutions/support',
  },
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}