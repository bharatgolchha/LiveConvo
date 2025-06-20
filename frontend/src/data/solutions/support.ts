import { 
  HeadphonesIcon,
  Clock,
  AlertCircle,
  Search,
  ThumbsDown,
  Zap,
  MessageSquare,
  Database,
  TrendingUp,
  Heart,
  BarChart3,
  Ticket
} from 'lucide-react'
import { SolutionData } from '@/types/solution'

export const supportSolutionData: SolutionData = {
  id: 'support',
  title: 'Customer Support',
  subtitle: 'AI-Powered Support Intelligence',
  heroHeadline: 'Resolve Issues 50% Faster with AI-Powered Support',
  heroSubheadline: 'Give every agent superpower with real-time suggestions, instant knowledge base access, and automated ticket creation.',
  heroCTA: 'Start Free 14-Day Trial',
  accentColor: 'orange',
  painPoints: [
    {
      icon: Clock,
      title: 'Long Average Handle Times',
      description: 'Agents waste time searching for answers while customers wait on hold'
    },
    {
      icon: ThumbsDown,
      title: 'Inconsistent Support Quality',
      description: 'New agents struggle while experienced ones carry the team'
    },
    {
      icon: Search,
      title: 'Knowledge Base Gaps',
      description: 'Critical solutions buried in outdated docs or tribal knowledge'
    },
    {
      icon: AlertCircle,
      title: 'Manual Ticket Management',
      description: 'Agents spend more time logging tickets than solving problems'
    }
  ],
  features: [
    {
      title: 'Real-Time Response Suggestions',
      description: 'Get instant solutions based on customer issues and historical resolutions',
      icon: MessageSquare
    },
    {
      title: 'Smart Knowledge Base Search',
      description: 'AI surfaces relevant articles and solutions as customers describe their problems',
      icon: Search
    },
    {
      title: 'Sentiment Analysis & Alerts',
      description: 'Detect frustrated customers and escalation risks before they churn',
      icon: Heart
    },
    {
      title: 'Automated Ticket Creation',
      description: 'Generate detailed tickets with full context, categories, and priority levels',
      icon: Ticket
    },
    {
      title: 'Performance Analytics',
      description: 'Track resolution times, customer satisfaction, and agent improvement',
      icon: BarChart3
    },
    {
      title: 'Proactive Issue Detection',
      description: 'Identify trending problems and suggest preemptive solutions',
      icon: TrendingUp
    }
  ],
  integrations: [
    { name: 'Zendesk' },
    { name: 'Intercom' },
    { name: 'Freshdesk' },
    { name: 'ServiceNow' },
    { name: 'Salesforce Service Cloud' },
    { name: 'Help Scout' }
  ],
  testimonials: [
    {
      quote: "Our average handle time dropped from 12 minutes to 6 minutes. New agents are productive from day one with AI guidance.",
      author: "Carlos Mendez",
      role: "Director of Support",
      company: "CloudServe Solutions"
    },
    {
      quote: "Customer satisfaction scores increased by 35%. The AI helps agents provide consistent, accurate solutions every time.",
      author: "Amanda Foster",
      role: "VP Customer Success",
      company: "TechSupport Pro"
    },
    {
      quote: "We've eliminated 80% of manual ticket work. Agents can focus on actually helping customers instead of data entry.",
      author: "Kevin Zhang",
      role: "Support Operations Manager",
      company: "HelpDesk Heroes"
    }
  ],
  stats: [
    { value: '50%', label: 'Faster resolution time' },
    { value: '35%', label: 'Higher CSAT scores' },
    { value: '80%', label: 'Less manual work' },
    { value: '24/7', label: 'Consistent quality' }
  ],
  faqs: [
    {
      question: 'How quickly do agents see the AI suggestions?',
      answer: 'Suggestions appear in under 2 seconds as customers describe their issues. The AI continuously updates recommendations based on the conversation flow.'
    },
    {
      question: 'Can it handle technical support queries?',
      answer: 'Yes! Upload your technical documentation, troubleshooting guides, and past resolutions. The AI learns from your specific products and solutions.'
    },
    {
      question: 'How does it integrate with our help desk?',
      answer: 'Native integrations with major platforms like Zendesk and Intercom. Tickets are created automatically with full conversation context and AI-suggested solutions.'
    },
    {
      question: 'Will it work with our custom knowledge base?',
      answer: 'Absolutely. The AI indexes your existing knowledge base and learns from resolved tickets to provide increasingly accurate suggestions.'
    },
    {
      question: 'Can managers track agent performance?',
      answer: 'Yes! Get detailed analytics on resolution times, customer satisfaction, and which agents might need additional training on specific issues.'
    }
  ],
  metaTitle: 'AI Customer Support Assistant | Real-Time Help Desk Intelligence | liveprompt.ai',
  metaDescription: 'Resolve customer issues 50% faster with AI-powered support. Real-time suggestions, automated tickets, and knowledge base integration. Try free for 14 days.',
  keywords: [
    'AI customer support',
    'support desk automation',
    'help desk AI assistant',
    'customer service AI',
    'support ticket automation',
    'real-time support intelligence',
    'agent assist software',
    'customer support tools',
    'help desk optimization',
    'support analytics platform'
  ]
}