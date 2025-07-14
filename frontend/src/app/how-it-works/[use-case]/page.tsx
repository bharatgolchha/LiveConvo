import { notFound } from 'next/navigation'
import { HowItWorksTemplate } from '@/components/how-it-works/HowItWorksTemplate'
import { salesHowItWorksData } from '@/data/how-it-works/sales'
import { supportHowItWorksData } from '@/data/how-it-works/support'
import { recruitingHowItWorksData } from '@/data/how-it-works/recruiting'
import { consultingHowItWorksData } from '@/data/how-it-works/consulting'
import { educationHowItWorksData } from '@/data/how-it-works/education'
import { HowItWorksData } from '@/types/how-it-works'

const howItWorksMap: Record<string, HowItWorksData> = {
  sales: salesHowItWorksData,
  support: supportHowItWorksData,
  recruiting: recruitingHowItWorksData,
  consulting: consultingHowItWorksData,
  education: educationHowItWorksData,
}

interface PageProps {
  params: Promise<{
    'use-case': string
  }>
}

export default async function HowItWorksPage({ params }: PageProps) {
  const resolvedParams = await params
  const useCase = resolvedParams['use-case']
  const data = howItWorksMap[useCase]
  
  if (!data) {
    notFound()
  }
  
  return <HowItWorksTemplate data={data} />
}

export async function generateStaticParams() {
  return Object.keys(howItWorksMap).map((useCase) => ({
    'use-case': useCase,
  }))
}