'use client'

import { SolutionData } from '@/types/solution'
import { Header } from '@/components/layout/Header'
import { HeroSection } from './HeroSection'
import { PainPointsSection } from './PainPointsSection'
import { FeaturesGrid } from './FeaturesGrid'
import { StatsSection } from './StatsSection'
import { TestimonialsSection } from './TestimonialsSection'
import { IntegrationsSection } from './IntegrationsSection'
import { SolutionFAQ } from './SolutionFAQ'
import { CTASection } from './CTASection'

interface SolutionPageTemplateProps {
  solution: SolutionData
}

export function SolutionPageTemplate({ solution }: SolutionPageTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      
      <HeroSection
        headline={solution.heroHeadline}
        subheadline={solution.heroSubheadline}
        cta={solution.heroCTA}
        accentColor={solution.accentColor}
      />
      
      <PainPointsSection
        painPoints={solution.painPoints}
        accentColor={solution.accentColor}
      />
      
      <FeaturesGrid
        features={solution.features}
        accentColor={solution.accentColor}
      />
      
      <StatsSection
        stats={solution.stats}
        accentColor={solution.accentColor}
      />
      
      <TestimonialsSection
        testimonials={solution.testimonials}
        accentColor={solution.accentColor}
      />
      
      <IntegrationsSection
        integrations={solution.integrations}
        accentColor={solution.accentColor}
      />
      
      <SolutionFAQ
        faqs={solution.faqs}
        accentColor={solution.accentColor}
      />
      
      <CTASection
        title={solution.title}
        accentColor={solution.accentColor}
      />
      
      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>&copy; 2025 liveprompt.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}