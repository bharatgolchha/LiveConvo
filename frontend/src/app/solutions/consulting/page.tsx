'use client'

import { SolutionPageTemplate } from '@/components/solutions/SolutionPageTemplate'
import { consultingSolutionData } from '@/data/solutions/consulting'

export default function ConsultingSolutionPage() {
  return <SolutionPageTemplate solution={consultingSolutionData} />
}