export interface TimelineStep {
  id: string
  title: string
  trigger: string
  aiAction: string
  userAction: string
  outcome: string
  timeIndicator: string
  screenshot?: string
  highlights?: string[]
}

export interface ConversationExample {
  speaker: 'user' | 'prospect' | 'ai'
  text: string
  timestamp?: string
  aiSuggestion?: string
}

export interface HowItWorksData {
  id: string
  title: string
  scenario: string
  objective: string
  heroImage?: string
  timelineSteps: TimelineStep[]
  conversationExample: ConversationExample[]
  setupSteps: {
    step: number
    title: string
    description: string
  }[]
  demoVideo?: string
  interactiveElements?: {
    type: 'hover' | 'click'
    id: string
    description: string
  }[]
  metaTitle: string
  metaDescription: string
}