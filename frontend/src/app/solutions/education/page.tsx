'use client'

import { SolutionPageTemplate } from '@/components/solutions/SolutionPageTemplate'
import { educationSolutionData } from '@/data/solutions/education'

export default function EducationSolutionPage() {
  return <SolutionPageTemplate solution={educationSolutionData} />
}