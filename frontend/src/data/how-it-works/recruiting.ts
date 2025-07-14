import { HowItWorksData } from '@/types/how-it-works'

export const recruitingHowItWorksData: HowItWorksData = {
  id: 'recruiting',
  title: 'Recruiters',
  scenario: "You're conducting a technical interview for a Senior Software Engineer position",
  objective: 'Assess technical skills and cultural fit while providing great candidate experience',
  timelineSteps: [
    {
      id: 'step1',
      title: 'Opening Questions',
      trigger: 'Interview begins, need to build rapport',
      aiAction: 'AI suggests ice-breaker questions based on candidate\'s background',
      userAction: 'You ask personalized opening questions to help candidate relax',
      outcome: 'Candidate opens up, interview starts on positive note',
      timeIndicator: 'Immediate',
      highlights: ['Rapport building', 'Personalized questions', 'Candidate comfort']
    },
    {
      id: 'step2',
      title: 'Technical Assessment',
      trigger: 'Candidate describes previous project architecture',
      aiAction: 'AI suggests follow-up technical questions to probe deeper',
      userAction: 'You ask specific questions about scalability and design decisions',
      outcome: 'Comprehensive understanding of candidate\'s technical depth',
      timeIndicator: '< 2 seconds',
      highlights: ['Technical probing', 'Skill assessment', 'Follow-up questions']
    },
    {
      id: 'step3',
      title: 'Red Flag Detection',
      trigger: 'Candidate gives concerning answer about team collaboration',
      aiAction: 'AI flags potential culture fit issue and suggests clarifying questions',
      userAction: 'You explore the topic deeper with behavioral questions',
      outcome: 'Better understanding of candidate\'s teamwork style',
      timeIndicator: '< 1.5 seconds',
      highlights: ['Red flag alerts', 'Behavioral questions', 'Culture fit assessment']
    },
    {
      id: 'step4',
      title: 'Competency Mapping',
      trigger: 'Discussion about specific programming languages',
      aiAction: 'AI tracks competencies against job requirements in real-time',
      userAction: 'You note strong Python skills but gaps in cloud experience',
      outcome: 'Clear competency matrix filled automatically',
      timeIndicator: 'Real-time tracking',
      highlights: ['Skill mapping', 'Requirement matching', 'Gap identification']
    },
    {
      id: 'step5',
      title: 'Interview Wrap-up',
      trigger: 'Time to close the interview',
      aiAction: 'AI generates candidate scorecard and suggests next steps',
      userAction: 'You explain next steps and timeline to candidate',
      outcome: 'Professional closure, automated scorecard ready for review',
      timeIndicator: 'Automatic',
      highlights: ['Scorecard generation', 'Next steps', 'Professional closure']
    }
  ],
  conversationExample: [
    {
      speaker: 'user',
      text: "Thanks for joining today! I see you've been working with microservices at your current company. Can you tell me about a challenging problem you solved?",
      timestamp: '10:05'
    },
    {
      speaker: 'prospect',
      text: "Sure! We had a major issue with service communication timeouts during peak loads. I redesigned our API gateway to implement circuit breakers...",
      timestamp: '10:06'
    },
    {
      speaker: 'ai',
      text: "Probe technical depth",
      timestamp: '10:07',
      aiSuggestion: "Good answer! Follow up with: 1) What monitoring did you implement? 2) How did you handle cascading failures? 3) What was the performance improvement?"
    },
    {
      speaker: 'user',
      text: "That's impressive! Circuit breakers are crucial for resilience. How did you monitor the health of services, and what metrics did you track?",
      timestamp: '10:08'
    },
    {
      speaker: 'prospect',
      text: "We used Prometheus for metrics and set up alerts for response times, error rates, and circuit breaker states...",
      timestamp: '10:09'
    },
    {
      speaker: 'ai',
      text: "Strong technical knowledge ✓",
      timestamp: '10:09',
      aiSuggestion: "Candidate shows: ✓ System design skills ✓ Monitoring expertise ✓ Problem-solving. Next: Ask about team collaboration and mentoring experience"
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Upload job descriptions',
      description: 'Add your open positions and required competencies'
    },
    {
      step: 2,
      title: 'Customize interview guides',
      description: 'Set up role-specific questions and evaluation criteria'
    },
    {
      step: 3,
      title: 'Conduct smarter interviews',
      description: 'Get real-time guidance and automated candidate scorecards'
    }
  ],
  metaTitle: 'How Recruiters Use liveprompt.ai | AI Interview Assistant',
  metaDescription: 'Discover how recruiters make better hiring decisions with real-time interview coaching, automated scorecards, and bias reduction.'
}