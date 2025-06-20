import { 
  Users,
  AlertTriangle,
  Clock,
  Brain,
  BarChart2,
  Shield,
  MessageSquare,
  FileSearch
} from 'lucide-react'
import { SolutionData } from '@/types/solution'

export const recruitingSolutionData: SolutionData = {
  id: 'recruiting',
  title: 'Recruiters',
  subtitle: 'AI-Powered Interview Intelligence',
  heroHeadline: 'Make Better Hires 3x Faster with AI Interview Intelligence',
  heroSubheadline: 'Get real-time interview guidance, eliminate bias, and never miss a red flag. Build winning teams with confidence.',
  heroCTA: 'Start Free 14-Day Trial',
  accentColor: 'green',
  painPoints: [
    {
      icon: Users,
      title: 'Inconsistent Interview Process',
      description: 'Different interviewers ask different questions, making fair comparison impossible'
    },
    {
      icon: AlertTriangle,
      title: 'Unconscious Bias in Hiring',
      description: 'Personal preferences override objective evaluation of skills and potential'
    },
    {
      icon: Clock,
      title: 'Slow Hiring Decisions',
      description: 'Lengthy debrief cycles and poor notes cause top talent to accept other offers'
    },
    {
      icon: Brain,
      title: 'Missing Critical Red Flags',
      description: 'Important behavioral cues and inconsistencies go unnoticed during interviews'
    }
  ],
  features: [
    {
      title: 'Smart Interview Questions',
      description: 'Get role-specific behavioral and technical questions based on the conversation flow',
      icon: MessageSquare
    },
    {
      title: 'Real-Time Candidate Scoring',
      description: 'Objective skill assessment with live scoring across key competencies',
      icon: BarChart2
    },
    {
      title: 'Bias Detection Alerts',
      description: 'AI flags potentially biased questions or evaluation criteria in real-time',
      icon: Shield
    },
    {
      title: 'Red Flag Detection',
      description: 'Identify inconsistencies, concerning behaviors, and culture fit issues instantly',
      icon: AlertTriangle
    },
    {
      title: 'Automated Scorecards',
      description: 'Generate comprehensive candidate evaluations with evidence-based ratings',
      icon: FileSearch
    },
    {
      title: 'Interview Intelligence Hub',
      description: 'Searchable database of all interviews with insights on what makes successful hires',
      icon: Brain
    }
  ],
  integrations: [
    { name: 'Greenhouse' },
    { name: 'Lever' },
    { name: 'BambooHR' },
    { name: 'Workday' },
    { name: 'LinkedIn Recruiter' },
    { name: 'Indeed' }
  ],
  testimonials: [
    {
      quote: "We've cut our time-to-hire by 40% while improving quality. The AI helps even junior recruiters conduct senior-level interviews effectively.",
      author: "Lisa Martinez",
      role: "Head of Talent",
      company: "FastGrowth Tech"
    },
    {
      quote: "The bias detection has been eye-opening. We're making more diverse hires and building stronger teams as a result.",
      author: "James Wilson",
      role: "VP People Operations",
      company: "Inclusive Innovations"
    },
    {
      quote: "No more bad hires slipping through. The AI catches red flags we used to miss, saving us hundreds of thousands in mis-hire costs.",
      author: "Priya Patel",
      role: "Recruiting Director",
      company: "ScaleUp Ventures"
    }
  ],
  stats: [
    { value: '40%', label: 'Faster time-to-hire' },
    { value: '3x', label: 'Better quality hires' },
    { value: '60%', label: 'Reduction in bias incidents' },
    { value: '85%', label: 'Interview consistency score' }
  ],
  faqs: [
    {
      question: 'How does the AI reduce bias in interviews?',
      answer: 'The AI monitors questions and evaluations for bias indicators, suggests objective criteria, and ensures all candidates are assessed on the same competencies. It also flags when personal preferences might be influencing decisions.'
    },
    {
      question: 'Can I customize the interview questions for different roles?',
      answer: 'Absolutely! Upload your interview guides and the AI will suggest relevant questions at the right moments. It learns from your best performers to recommend questions that predict success.'
    },
    {
      question: 'How does it integrate with our ATS?',
      answer: 'We have native integrations with major ATS platforms. Interview recordings, scores, and notes sync automatically. Candidate profiles are enriched with AI insights for better decision-making.'
    },
    {
      question: 'What about candidate privacy?',
      answer: 'We take privacy seriously. Candidates are notified about AI assistance, all data is encrypted, and we comply with GDPR, CCPA, and EEOC guidelines. Recordings can be auto-deleted after specified periods.'
    },
    {
      question: 'Can it help with technical interviews?',
      answer: 'Yes! The AI can assess coding explanations, system design discussions, and technical problem-solving. It provides real-time prompts for follow-up questions to properly evaluate technical depth.'
    }
  ],
  metaTitle: 'AI Interview Assistant for Recruiters | Hiring Intelligence Platform | liveprompt.ai',
  metaDescription: 'Hire better talent 40% faster with AI interview intelligence. Real-time guidance, bias detection, and automated scorecards for recruiters. Start free trial.',
  keywords: [
    'AI interview assistant',
    'recruiting intelligence platform',
    'hiring AI software',
    'interview bias detection',
    'candidate assessment tool',
    'recruiting automation',
    'talent acquisition AI',
    'interview scoring software',
    'recruitment technology',
    'hiring process optimization'
  ]
}