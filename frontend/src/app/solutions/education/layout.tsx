import { Metadata } from 'next'
import { educationSolutionData } from '@/data/solutions/education'

export const metadata: Metadata = {
  title: educationSolutionData.metaTitle,
  description: educationSolutionData.metaDescription,
  keywords: educationSolutionData.keywords.join(', '),
  openGraph: {
    title: educationSolutionData.metaTitle,
    description: educationSolutionData.metaDescription,
    type: 'website',
    url: 'https://liveprompt.ai/solutions/education',
    images: [
      {
        url: 'https://liveprompt.ai/og-education.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai for Educators',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: educationSolutionData.metaTitle,
    description: educationSolutionData.metaDescription,
    images: ['https://liveprompt.ai/og-education.png'],
  },
  alternates: {
    canonical: 'https://liveprompt.ai/solutions/education',
  },
}

export default function EducationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}