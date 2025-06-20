import { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://liveprompt.ai'),
}

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}