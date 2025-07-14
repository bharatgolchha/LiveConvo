import { HowItWorksData } from '@/types/how-it-works'

export const salesHowItWorksData: HowItWorksData = {
  id: 'sales',
  title: 'Sales Teams',
  scenario: "You're on a discovery call with a potential enterprise client discussing your SaaS solution",
  objective: 'Close the deal by addressing objections and uncovering budget authority',
  timelineSteps: [
    {
      id: 'step1',
      title: 'Prospect Mentions Competition',
      trigger: 'Prospect says: "We\'re also looking at your competitor X"',
      aiAction: 'AI instantly displays competitive battlecard with key differentiators and talk track',
      userAction: 'You smoothly highlight your unique value propositions without hesitation',
      outcome: 'Prospect is impressed by your detailed knowledge and confidence',
      timeIndicator: '< 2 seconds',
      highlights: ['Competitive intelligence', 'Real-time battlecards', 'Confidence boost']
    },
    {
      id: 'step2',
      title: 'Budget Objection Surfaces',
      trigger: 'Prospect says: "This seems expensive for our current budget"',
      aiAction: 'AI suggests ROI calculator points and payment flexibility options',
      userAction: 'You present specific ROI metrics and offer flexible payment terms',
      outcome: 'Objection handled professionally, conversation continues positively',
      timeIndicator: '< 1.5 seconds',
      highlights: ['Objection handling', 'ROI talking points', 'Flexible solutions']
    },
    {
      id: 'step3',
      title: 'Discovery Question Reminder',
      trigger: 'Conversation reaches 15-minute mark',
      aiAction: 'AI reminds you to ask about decision-making timeline and stakeholders',
      userAction: 'You naturally ask about their evaluation process and key decision makers',
      outcome: 'Uncover that CFO approval is needed, adjust strategy accordingly',
      timeIndicator: 'Proactive reminder',
      highlights: ['BANT qualification', 'Strategic reminders', 'Deal intelligence']
    },
    {
      id: 'step4',
      title: 'Technical Question Asked',
      trigger: 'Prospect asks: "How does your API handle rate limiting?"',
      aiAction: 'AI provides accurate technical details from your knowledge base',
      userAction: 'You confidently explain the technical capabilities',
      outcome: 'Technical concerns addressed, credibility established',
      timeIndicator: '< 2 seconds',
      highlights: ['Technical accuracy', 'Knowledge base access', 'Instant answers']
    },
    {
      id: 'step5',
      title: 'Call Wrap-up',
      trigger: 'Call reaching conclusion',
      aiAction: 'AI suggests next steps based on conversation and generates follow-up email draft',
      userAction: 'You confirm specific next steps and timeline with prospect',
      outcome: 'Clear action items agreed, follow-up scheduled, CRM auto-updated',
      timeIndicator: 'Real-time',
      highlights: ['Automated follow-up', 'CRM integration', 'Clear next steps']
    }
  ],
  conversationExample: [
    {
      speaker: 'prospect',
      text: "So we're currently evaluating a few solutions, including CompetitorX.",
      timestamp: '10:32'
    },
    {
      speaker: 'ai',
      text: "Show competitive advantages",
      timestamp: '10:32',
      aiSuggestion: "Key advantages over CompetitorX: 1) 50% faster implementation, 2) No user limits on Enterprise plan, 3) 24/7 phone support included"
    },
    {
      speaker: 'user',
      text: "I'm glad you're doing your research. What specific challenges led you to evaluate CompetitorX? I ask because we often find that while they're good at X, our clients choose us for our faster implementation time and unlimited user model...",
      timestamp: '10:33'
    },
    {
      speaker: 'prospect',
      text: "That's interesting. The unlimited users would definitely help. But honestly, the pricing seems quite high for our current budget.",
      timestamp: '10:34'
    },
    {
      speaker: 'ai',
      text: "Address pricing concern",
      timestamp: '10:34',
      aiSuggestion: "ROI points: Average client sees 3.2x ROI in 6 months. Offer: 1) Quarterly payment option 2) Start with Starter plan and upgrade 3) Volume discount for 2-year commitment"
    },
    {
      speaker: 'user',
      text: "I understand budget is always a consideration. Let me share some numbers - our average client sees ROI within 6 months. Would it help if I showed you our ROI calculator? Also, we have flexible payment options...",
      timestamp: '10:35'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Sign up and connect your calendar',
      description: 'Create your account and sync with Google Calendar or Outlook in one click'
    },
    {
      step: 2,
      title: 'Upload your sales materials',
      description: 'Add your pitch decks, battlecards, and pricing info to personalize AI responses'
    },
    {
      step: 3,
      title: 'Join your next sales call',
      description: 'Open liveprompt.ai in your browser during any call and watch the magic happen'
    }
  ],
  demoVideo: '/demo/sales-demo',
  metaTitle: 'How Sales Teams Use liveprompt.ai | Live AI Sales Coaching',
  metaDescription: 'See exactly how sales teams use liveprompt.ai to close more deals with real-time AI coaching, objection handling, and CRM automation.'
}