'use client'

import { SolutionPageTemplate } from '@/components/solutions/SolutionPageTemplate'
import { salesSolutionData } from '@/data/solutions/sales'

export default function SalesSolutionPage() {
  return <SolutionPageTemplate solution={salesSolutionData} />
}