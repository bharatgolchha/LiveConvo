import { HowItWorksData } from '@/types/how-it-works'

export const educationHowItWorksData: HowItWorksData = {
  id: 'education',
  title: 'Educators',
  scenario: "You're teaching an online calculus class with 30 students on Zoom",
  objective: 'Keep students engaged, check understanding, and adapt teaching pace in real-time',
  timelineSteps: [
    {
      id: 'step1',
      title: 'Engagement Monitoring',
      trigger: 'Several students seem confused during derivative explanation',
      aiAction: 'AI detects confusion patterns and suggests comprehension check',
      userAction: 'You pause and ask a quick poll question to gauge understanding',
      outcome: 'Identify that 40% need more explanation, adjust teaching approach',
      timeIndicator: 'Real-time detection',
      highlights: ['Engagement tracking', 'Comprehension checks', 'Adaptive teaching']
    },
    {
      id: 'step2',
      title: 'Interactive Learning',
      trigger: 'Complex concept needs reinforcement',
      aiAction: 'AI generates practice problem based on current topic',
      userAction: 'You share problem and give students 2 minutes to solve',
      outcome: 'Students actively engage, learning reinforced through practice',
      timeIndicator: '< 3 seconds',
      highlights: ['Problem generation', 'Active learning', 'Instant exercises']
    },
    {
      id: 'step3',
      title: 'Student Question',
      trigger: 'Student asks: "How does this apply to real-world engineering?"',
      aiAction: 'AI provides relevant real-world examples and applications',
      userAction: 'You explain bridge design and load calculations using derivatives',
      outcome: 'Abstract concept connected to practical application',
      timeIndicator: '< 2 seconds',
      highlights: ['Real-world examples', 'Application suggestions', 'Contextual learning']
    },
    {
      id: 'step4',
      title: 'Participation Tracking',
      trigger: 'Need to ensure all students are participating',
      aiAction: 'AI tracks who has/hasn\'t contributed and suggests engagement tactics',
      userAction: 'You call on specific quiet students with easier questions',
      outcome: 'Increased participation from typically quiet students',
      timeIndicator: 'Continuous tracking',
      highlights: ['Participation equity', 'Student tracking', 'Inclusive teaching']
    },
    {
      id: 'step5',
      title: 'Session Summary',
      trigger: 'Class ending, need to reinforce key concepts',
      aiAction: 'AI generates summary of key points and suggested homework',
      userAction: 'You review main concepts and assign relevant practice problems',
      outcome: 'Students receive clear summary and targeted homework',
      timeIndicator: 'Automatic',
      highlights: ['Auto-summaries', 'Homework generation', 'Learning reinforcement']
    }
  ],
  conversationExample: [
    {
      speaker: 'user',
      text: "Now, let's look at the derivative of x². Can anyone tell me what we get when we differentiate this?",
      timestamp: '10:15'
    },
    {
      speaker: 'prospect',
      text: "[Several students look confused, minimal responses in chat]",
      timestamp: '10:16'
    },
    {
      speaker: 'ai',
      text: "Low engagement detected",
      timestamp: '10:16',
      aiSuggestion: "Only 20% responding. Try: 1) Break it down with power rule 2) Use visual representation 3) Quick poll: 'On a scale 1-5, how confident are you with derivatives?'"
    },
    {
      speaker: 'user',
      text: "I'm sensing some uncertainty. Let's do a quick check - in the chat, rate 1-5 how confident you feel about derivatives right now. Be honest!",
      timestamp: '10:17'
    },
    {
      speaker: 'prospect',
      text: "[Chat fills with responses: mostly 2s and 3s]",
      timestamp: '10:17'
    },
    {
      speaker: 'ai',
      text: "Adjust teaching approach",
      timestamp: '10:17',
      aiSuggestion: "Average confidence: 2.4/5. Recommendation: Step back to basics. Use visual: show function as curve, derivative as slope. Then return to x² example with graph"
    },
    {
      speaker: 'user',
      text: "Thanks for the honesty! Let's take a step back. I'm going to share my screen and show you visually what a derivative represents...",
      timestamp: '10:18'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Set up your virtual classroom',
      description: 'Connect with Zoom, Teams, or Google Meet'
    },
    {
      step: 2,
      title: 'Upload course materials',
      description: 'Add syllabus, lesson plans, and learning objectives'
    },
    {
      step: 3,
      title: 'Teach with AI assistance',
      description: 'Get real-time engagement insights and teaching suggestions'
    }
  ],
  metaTitle: 'How Educators Use liveprompt.ai | AI Teaching Assistant',
  metaDescription: 'Discover how educators enhance virtual learning with real-time engagement tracking, automated quizzes, and adaptive teaching suggestions.'
}