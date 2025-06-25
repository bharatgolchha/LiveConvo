'use client'

import { SolutionPageTemplate } from '@/components/solutions/SolutionPageTemplate'
import { recruitingSolutionData } from '@/data/solutions/recruiting'

export default function RecruitingSolutionPage() {
  return <SolutionPageTemplate solution={recruitingSolutionData} />
}