import { HowItWorksData } from '@/types/how-it-works'

export const supportHowItWorksData: HowItWorksData = {
  id: 'support',
  title: 'Customer Support',
  scenario: "You're handling a technical support call from a frustrated customer experiencing login issues",
  objective: 'Resolve the issue quickly while maintaining high customer satisfaction',
  timelineSteps: [
    {
      id: 'step1',
      title: 'Customer Describes Issue',
      trigger: 'Customer says: "I can\'t log in and I\'ve tried resetting my password three times!"',
      aiAction: 'AI identifies issue pattern and suggests troubleshooting steps from knowledge base',
      userAction: 'You acknowledge frustration and guide through specific troubleshooting steps',
      outcome: 'Customer feels heard and follows your guidance',
      timeIndicator: '< 2 seconds',
      highlights: ['Empathy coaching', 'Knowledge base search', 'Issue recognition']
    },
    {
      id: 'step2',
      title: 'Technical Details Needed',
      trigger: 'Need to gather browser and system information',
      aiAction: 'AI provides checklist of technical questions to ask',
      userAction: 'You systematically collect all necessary technical details',
      outcome: 'Complete diagnostic information gathered efficiently',
      timeIndicator: 'Real-time',
      highlights: ['Diagnostic checklist', 'Efficient data gathering', 'Complete information']
    },
    {
      id: 'step3',
      title: 'Known Issue Detected',
      trigger: 'Symptoms match recent service outage pattern',
      aiAction: 'AI alerts you to matching issue pattern and provides workaround',
      userAction: 'You explain the known issue and provide immediate workaround',
      outcome: 'Customer successfully logs in using workaround',
      timeIndicator: '< 1.5 seconds',
      highlights: ['Pattern matching', 'Instant solutions', 'Workaround database']
    },
    {
      id: 'step4',
      title: 'Escalation Prevention',
      trigger: 'Customer mentions considering cancellation',
      aiAction: 'AI suggests retention offers and escalation prevention tactics',
      userAction: 'You offer account credit and priority support for inconvenience',
      outcome: 'Customer satisfaction restored, escalation avoided',
      timeIndicator: '< 2 seconds',
      highlights: ['Retention strategies', 'De-escalation tactics', 'Customer save']
    },
    {
      id: 'step5',
      title: 'Ticket Resolution',
      trigger: 'Issue resolved, wrapping up call',
      aiAction: 'AI generates ticket summary and suggests follow-up actions',
      userAction: 'You confirm resolution and schedule follow-up check-in',
      outcome: 'Ticket auto-created with full details, CSAT survey scheduled',
      timeIndicator: 'Automatic',
      highlights: ['Auto-documentation', 'Follow-up scheduling', 'CSAT tracking']
    }
  ],
  conversationExample: [
    {
      speaker: 'prospect',
      text: "This is so frustrating! I've been trying to log in for 30 minutes and nothing works!",
      timestamp: '14:22'
    },
    {
      speaker: 'ai',
      text: "Show empathy + troubleshoot",
      timestamp: '14:22',
      aiSuggestion: "Acknowledge frustration first. Known issue: Chrome 120+ cookie bug. Workaround: 1) Clear cookies for our domain 2) Try incognito mode 3) Use Firefox/Safari"
    },
    {
      speaker: 'user',
      text: "I completely understand your frustration - 30 minutes is way too long to be dealing with login issues. Let me help you get this sorted right away. Can you tell me which browser you're using?",
      timestamp: '14:23'
    },
    {
      speaker: 'prospect',
      text: "I'm using Chrome. I just updated it yesterday actually.",
      timestamp: '14:23'
    },
    {
      speaker: 'ai',
      text: "Chrome 120 issue confirmed",
      timestamp: '14:23',
      aiSuggestion: "This is the Chrome 120 cookie bug. Guide them through: Settings > Privacy > Cookies > See all cookies > Search our domain > Remove all"
    },
    {
      speaker: 'user',
      text: "Ah, that helps explain it. We've identified an issue with the latest Chrome update. I have a quick workaround that's been working for other customers. Could you open Chrome settings for me?",
      timestamp: '14:24'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Connect your help desk',
      description: 'Integrate with Zendesk, Intercom, or Freshdesk in seconds'
    },
    {
      step: 2,
      title: 'Import your knowledge base',
      description: 'Upload FAQs, troubleshooting guides, and common solutions'
    },
    {
      step: 3,
      title: 'Start taking calls',
      description: 'AI coaches you through every support interaction in real-time'
    }
  ],
  metaTitle: 'How Customer Support Teams Use liveprompt.ai | AI Support Coaching',
  metaDescription: 'See how support teams resolve issues 50% faster with real-time AI assistance, automated ticket creation, and knowledge base integration.'
}