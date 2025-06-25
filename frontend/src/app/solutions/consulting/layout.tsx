import { Metadata } from 'next'
import { consultingSolutionData } from '@/data/solutions/consulting'

export const metadata: Metadata = {
  title: consultingSolutionData.metaTitle,
  description: consultingSolutionData.metaDescription,
  keywords: consultingSolutionData.keywords.join(', '),
  openGraph: {
    title: consultingSolutionData.metaTitle,
    description: consultingSolutionData.metaDescription,
    type: 'website',
    url: 'https://liveprompt.ai/solutions/consulting',
    images: [
      {
        url: 'https://liveprompt.ai/og-consulting.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai for Consultants',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: consultingSolutionData.metaTitle,
    description: consultingSolutionData.metaDescription,
    images: ['https://liveprompt.ai/og-consulting.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai/solutions/consulting',
  },
}

export default function ConsultingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}