import { 
  TrendingUp, 
  Target, 
  AlertCircle, 
  Clock, 
  Database,
  MessageSquare,
  BarChart3,
  Shield,
  Brain,
  Sparkles
} from 'lucide-react'
import { SolutionData } from '@/types/solution'

export const salesSolutionData: SolutionData = {
  id: 'sales',
  title: 'Sales Teams',
  subtitle: 'AI-Powered Sales Intelligence',
  heroHeadline: 'Close 30% More Deals with Real-Time AI Sales Coaching',
  heroSubheadline: 'Get instant guidance on discovery questions, objection handling, and next steps during every sales call. Never miss another opportunity.',
  heroCTA: 'Start Free 14-Day Trial',
  accentColor: 'blue',
  painPoints: [
    {
      icon: Target,
      title: 'Missing Critical Discovery Questions',
      description: 'Forgetting to ask about budget, timeline, or decision criteria costs you deals'
    },
    {
      icon: AlertCircle,
      title: 'Struggling with Objection Handling',
      description: 'Stumbling over common objections reduces your credibility and close rates'
    },
    {
      icon: Clock,
      title: 'Time Wasted on Admin Tasks',
      description: 'Spending hours updating CRM and writing follow-ups instead of selling'
    },
    {
      icon: Database,
      title: 'Lost Deal Intelligence',
      description: 'Critical insights from calls disappear without proper documentation'
    }
  ],
  features: [
    {
      title: 'Real-Time Talk Tracks',
      description: 'Get instant suggestions for discovery questions and value propositions based on the conversation flow',
      icon: MessageSquare
    },
    {
      title: 'Objection Handling AI',
      description: 'Receive proven responses to common objections tailored to your product and industry',
      icon: Shield
    },
    {
      title: 'Competitive Battlecards',
      description: 'Access competitor comparisons and differentiators the moment they\'re mentioned',
      icon: BarChart3
    },
    {
      title: 'Automated CRM Updates',
      description: 'Sync call notes, next steps, and deal stage changes directly to Salesforce or HubSpot',
      icon: Database
    },
    {
      title: 'Deal Intelligence Alerts',
      description: 'Get notified of buying signals, risk indicators, and stakeholder dynamics in real-time',
      icon: Brain
    },
    {
      title: 'Smart Follow-Up Drafts',
      description: 'Generate personalized follow-up emails with action items and next steps in seconds',
      icon: Sparkles
    }
  ],
  integrations: [
    { name: 'Salesforce' },
    { name: 'HubSpot' },
    { name: 'Pipedrive' },
    { name: 'Microsoft Dynamics' },
    { name: 'Zoom' },
    { name: 'Google Meet' }
  ],
  testimonials: [
    {
      quote: "liveprompt.ai helped our team increase close rates by 28% in just 3 months. The real-time coaching is like having our best sales manager on every call.",
      author: "Sarah Chen",
      role: "VP of Sales",
      company: "TechScale Inc"
    },
    {
      quote: "The objection handling suggestions are incredible. I feel so much more confident on calls knowing I have AI backup for tough questions.",
      author: "Michael Rodriguez",
      role: "Account Executive",
      company: "CloudFirst Solutions"
    },
    {
      quote: "We've cut our CRM update time by 75%. The automated summaries capture everything perfectly, letting our reps focus on selling.",
      author: "Jennifer Walsh",
      role: "Sales Operations Director",
      company: "DataDrive Systems"
    }
  ],
  stats: [
    { value: '28%', label: 'Average increase in close rate' },
    { value: '2.5x', label: 'More qualified opportunities' },
    { value: '75%', label: 'Less time on admin work' },
    { value: '<2s', label: 'Response time for AI suggestions' }
  ],
  faqs: [
    {
      question: 'How does liveprompt.ai integrate with my sales stack?',
      answer: 'We offer native integrations with major CRMs like Salesforce, HubSpot, and Pipedrive. Call summaries, action items, and insights sync automatically after each call. You can also use our API for custom integrations.'
    },
    {
      question: 'Will my competitors know I\'m using AI assistance?',
      answer: 'No. liveprompt.ai operates silently in your browser. Only you can see the AI suggestions - they\'re never visible or audible to other call participants.'
    },
    {
      question: 'Can I customize the AI coaching for my specific product?',
      answer: 'Yes! You can upload your sales playbooks, battle cards, and objection handling guides. The AI learns your unique value props and tailors suggestions accordingly.'
    },
    {
      question: 'How quickly do reps see results?',
      answer: 'Most sales reps report feeling more confident within their first week. Measurable improvements in close rates typically appear within 30-45 days of consistent use.'
    },
    {
      question: 'Is my customer data secure?',
      answer: 'Absolutely. We\'re SOC 2 Type II certified and use bank-level encryption. Call data is processed in real-time and never stored on our servers. We\'re also GDPR and CCPA compliant.'
    }
  ],
  metaTitle: 'AI Sales Coaching Platform | Real-Time Call Intelligence | liveprompt.ai',
  metaDescription: 'Close more deals with AI-powered sales coaching. Get real-time talk tracks, objection handling, and CRM automation during every sales call. Try free for 14 days.',
  keywords: [
    'AI sales coach',
    'real-time sales intelligence',
    'sales call AI assistant',
    'AI objection handling',
    'sales enablement software',
    'conversation intelligence',
    'revenue intelligence platform',
    'AI sales tools',
    'sales coaching software',
    'CRM automation'
  ]
}