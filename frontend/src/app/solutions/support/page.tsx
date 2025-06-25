'use client'

import { SolutionPageTemplate } from '@/components/solutions/SolutionPageTemplate'
import { supportSolutionData } from '@/data/solutions/support'

export default function SupportSolutionPage() {
  return <SolutionPageTemplate solution={supportSolutionData} />
}