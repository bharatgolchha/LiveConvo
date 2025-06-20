import { Metadata } from 'next'
import { salesSolutionData } from '@/data/solutions/sales'

export const metadata: Metadata = {
  title: salesSolutionData.metaTitle,
  description: salesSolutionData.metaDescription,
  keywords: salesSolutionData.keywords.join(', '),
  openGraph: {
    title: salesSolutionData.metaTitle,
    description: salesSolutionData.metaDescription,
    type: 'website',
    url: 'https://liveprompt.ai/solutions/sales',
    images: [
      {
        url: 'https://liveprompt.ai/og-sales.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai for Sales Teams',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: salesSolutionData.metaTitle,
    description: salesSolutionData.metaDescription,
    images: ['https://liveprompt.ai/og-sales.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai/solutions/sales',
  },
}

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}