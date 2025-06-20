import { Metadata } from 'next'
import { recruitingSolutionData } from '@/data/solutions/recruiting'

export const metadata: Metadata = {
  title: recruitingSolutionData.metaTitle,
  description: recruitingSolutionData.metaDescription,
  keywords: recruitingSolutionData.keywords.join(', '),
  openGraph: {
    title: recruitingSolutionData.metaTitle,
    description: recruitingSolutionData.metaDescription,
    type: 'website',
    url: 'https://liveprompt.ai/solutions/recruiting',
    images: [
      {
        url: 'https://liveprompt.ai/og-recruiting.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai for Recruiters',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: recruitingSolutionData.metaTitle,
    description: recruitingSolutionData.metaDescription,
    images: ['https://liveprompt.ai/og-recruiting.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai/solutions/recruiting',
  },
}

export default function RecruitingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}