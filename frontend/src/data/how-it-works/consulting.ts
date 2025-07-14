import { HowItWorksData } from '@/types/how-it-works'

export const consultingHowItWorksData: HowItWorksData = {
  id: 'consulting',
  title: 'Consultants',
  scenario: "You're leading a strategy session with C-suite executives on digital transformation",
  objective: 'Capture key insights, drive strategic decisions, and deliver immediate value',
  timelineSteps: [
    {
      id: 'step1',
      title: 'Stakeholder Insights',
      trigger: 'CEO shares concerns about competitive threats',
      aiAction: 'AI captures concern and suggests framework for competitive analysis',
      userAction: 'You introduce relevant strategic framework and facilitate discussion',
      outcome: 'Structured approach to addressing competitive landscape',
      timeIndicator: '< 2 seconds',
      highlights: ['Framework suggestions', 'Strategic guidance', 'Stakeholder alignment']
    },
    {
      id: 'step2',
      title: 'Complex Analysis',
      trigger: 'CFO questions ROI of proposed digital initiatives',
      aiAction: 'AI provides industry benchmarks and ROI calculation templates',
      userAction: 'You present relevant case studies and ROI projections',
      outcome: 'Data-driven discussion with clear financial implications',
      timeIndicator: '< 1.5 seconds',
      highlights: ['Industry benchmarks', 'ROI calculations', 'Data insights']
    },
    {
      id: 'step3',
      title: 'Action Item Tracking',
      trigger: 'Multiple action items discussed across departments',
      aiAction: 'AI tracks all commitments with owners and deadlines in real-time',
      userAction: 'You confirm action items and accountability with stakeholders',
      outcome: 'Clear roadmap with assigned responsibilities',
      timeIndicator: 'Real-time tracking',
      highlights: ['Action tracking', 'Accountability matrix', 'Deadline management']
    },
    {
      id: 'step4',
      title: 'Strategic Synthesis',
      trigger: 'Discussion covering multiple complex topics',
      aiAction: 'AI synthesizes key themes and strategic implications',
      userAction: 'You summarize insights and propose strategic recommendations',
      outcome: 'Clear strategic direction with executive buy-in',
      timeIndicator: 'Continuous analysis',
      highlights: ['Theme synthesis', 'Strategic insights', 'Executive alignment']
    },
    {
      id: 'step5',
      title: 'Deliverable Creation',
      trigger: 'Meeting concludes, deliverables needed',
      aiAction: 'AI generates executive summary and detailed action plan',
      userAction: 'You review and share professional deliverables immediately',
      outcome: 'Impressed clients receive polished materials same day',
      timeIndicator: 'Instant generation',
      highlights: ['Auto-documentation', 'Executive summaries', 'Same-day delivery']
    }
  ],
  conversationExample: [
    {
      speaker: 'prospect',
      text: "Our main concern is that new digital-first competitors are eating into our market share. We need to transform but don't know where to start.",
      timestamp: '14:15'
    },
    {
      speaker: 'ai',
      text: "Suggest framework",
      timestamp: '14:15',
      aiSuggestion: "Apply Digital Maturity Framework: 1) Assess current state across customer experience, operations, and business model 2) Identify quick wins vs. transformational initiatives 3) Build phased roadmap"
    },
    {
      speaker: 'user',
      text: "That's a critical insight. Let's use a Digital Maturity Framework to structure our approach. We'll assess three dimensions: customer experience, operational efficiency, and business model innovation...",
      timestamp: '14:16'
    },
    {
      speaker: 'prospect',
      text: "That makes sense, but what kind of investment are we looking at? And how quickly can we see returns?",
      timestamp: '14:17'
    },
    {
      speaker: 'ai',
      text: "ROI benchmarks available",
      timestamp: '14:17',
      aiSuggestion: "Industry avg: Digital transformation ROI 230% over 3 years. Quick wins (3-6 months): Process automation (30-50% efficiency), Customer self-service (20% cost reduction)"
    },
    {
      speaker: 'user',
      text: "Based on industry benchmarks, companies typically see 230% ROI over three years. But let me share some quick wins - process automation can deliver 30-50% efficiency gains within 3-6 months...",
      timestamp: '14:18'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Configure your practice areas',
      description: 'Set up frameworks, methodologies, and industry expertise'
    },
    {
      step: 2,
      title: 'Upload client context',
      description: 'Add background materials and engagement objectives'
    },
    {
      step: 3,
      title: 'Lead smarter sessions',
      description: 'Focus on strategy while AI handles notes and insights'
    }
  ],
  metaTitle: 'How Consultants Use liveprompt.ai | AI Meeting Intelligence',
  metaDescription: 'See how consultants deliver more value with AI-powered meeting facilitation, instant insights, and automated deliverables.'
}