import { 
  Briefcase,
  Clock,
  FileText,
  TrendingDown,
  CheckSquare,
  BarChart,
  Users,
  Lightbulb,
  Target,
  Calendar,
  MessageSquare,
  PenTool
} from 'lucide-react'
import { SolutionData } from '@/types/solution'

export const consultingSolutionData: SolutionData = {
  id: 'consulting',
  title: 'Consultants',
  subtitle: 'AI-Powered Meeting Intelligence',
  heroHeadline: 'Bill for Strategy, Not Note-Taking',
  heroSubheadline: 'Let AI capture every insight while you focus on delivering value. Get professional summaries and action items instantly after every client meeting.',
  heroCTA: 'Start Free 14-Day Trial',
  accentColor: 'purple',
  painPoints: [
    {
      icon: Clock,
      title: 'Hours Lost to Documentation',
      description: 'Spending 30% of billable time writing meeting notes and reports'
    },
    {
      icon: FileText,
      title: 'Missing Critical Action Items',
      description: 'Important commitments get lost without proper tracking systems'
    },
    {
      icon: TrendingDown,
      title: 'Inconsistent Client Follow-Ups',
      description: 'Delayed or forgotten follow-ups damage client relationships'
    },
    {
      icon: Users,
      title: 'Knowledge Silos Across Teams',
      description: 'Valuable insights trapped with individual consultants'
    }
  ],
  features: [
    {
      title: 'Automated Meeting Minutes',
      description: 'Get structured summaries with key decisions, insights, and next steps within 30 seconds',
      icon: FileText
    },
    {
      title: 'Smart Action Item Extraction',
      description: 'AI identifies and assigns action items with owners and due dates automatically',
      icon: CheckSquare
    },
    {
      title: 'Client Insight Tracking',
      description: 'Build a searchable knowledge base of client preferences, pain points, and goals',
      icon: Lightbulb
    },
    {
      title: 'Engagement Analytics',
      description: 'Track speaking time, sentiment, and engagement levels to improve client relationships',
      icon: BarChart
    },
    {
      title: 'Follow-Up Draft Generation',
      description: 'Create professional follow-up emails with summaries and next steps in one click',
      icon: MessageSquare
    },
    {
      title: 'Deliverable Templates',
      description: 'Transform meeting insights into client-ready deliverables using your templates',
      icon: PenTool
    }
  ],
  integrations: [
    { name: 'Notion' },
    { name: 'Monday.com' },
    { name: 'Asana' },
    { name: 'Microsoft Teams' },
    { name: 'Slack' },
    { name: 'Google Workspace' }
  ],
  testimonials: [
    {
      quote: "We've reclaimed 8-10 hours per consultant per week. The AI summaries are so comprehensive that partners can stay informed without attending every meeting.",
      author: "David Park",
      role: "Managing Partner",
      company: "Strategic Advisors Group"
    },
    {
      quote: "The client insight tracking has transformed how we manage relationships. We never miss important details and our clients love the attention to detail.",
      author: "Rachel Thompson",
      role: "Senior Consultant",
      company: "Innovation Partners"
    },
    {
      quote: "Action items actually get done now. The automated tracking and follow-ups have increased our project completion rates by 40%.",
      author: "Mark Stevens",
      role: "Project Director",
      company: "Transform Consulting"
    }
  ],
  stats: [
    { value: '10hrs', label: 'Saved per consultant weekly' },
    { value: '40%', label: 'Faster project delivery' },
    { value: '95%', label: 'Action item completion rate' },
    { value: '3x', label: 'More client touchpoints' }
  ],
  faqs: [
    {
      question: 'How accurate are the meeting summaries?',
      answer: 'Our AI achieves 95%+ accuracy in capturing key points, decisions, and action items. Summaries are structured using consulting best practices and can be edited before sharing.'
    },
    {
      question: 'Can I customize summaries for different client types?',
      answer: 'Yes! Create custom templates for different engagement types - strategy sessions, workshops, status updates, etc. The AI adapts to your preferred format and terminology.'
    },
    {
      question: 'How does it handle confidential client information?',
      answer: 'All data is encrypted end-to-end and processed in real-time without storage. We\'re SOC 2 certified and sign NDAs. You can also deploy on-premise for sensitive clients.'
    },
    {
      question: 'Will it work with my existing project management tools?',
      answer: 'We integrate with Notion, Monday, Asana, and more. Action items and insights sync automatically to your existing workflows.'
    },
    {
      question: 'Can my entire team share insights?',
      answer: 'Yes! Build a searchable knowledge base of all client interactions. Team members can access insights from any meeting, improving collaboration and continuity.'
    }
  ],
  metaTitle: 'AI Meeting Assistant for Consultants | Automated Documentation | liveprompt.ai',
  metaDescription: 'Stop wasting billable hours on notes. AI captures meeting insights, action items, and follow-ups automatically. Built for management consultants. Try free.',
  keywords: [
    'consulting AI assistant',
    'automated meeting notes',
    'consultant productivity tools',
    'meeting intelligence platform',
    'action item tracking',
    'client relationship management',
    'professional services automation',
    'meeting documentation software',
    'consultant efficiency tools',
    'AI meeting summaries'
  ]
}