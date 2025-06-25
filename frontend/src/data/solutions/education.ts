import { 
  GraduationCap,
  Users,
  Brain,
  Clock,
  FileQuestion,
  BarChart,
  MessageCircle,
  Target,
  TrendingUp,
  BookOpen
} from 'lucide-react'
import { SolutionData } from '@/types/solution'

export const educationSolutionData: SolutionData = {
  id: 'education',
  title: 'Educators',
  subtitle: 'AI-Powered Teaching Assistant',
  heroHeadline: 'Transform Virtual Learning with AI Engagement Tools',
  heroSubheadline: 'Keep students engaged, track participation in real-time, and automate tedious tasks. Make every virtual class as effective as in-person.',
  heroCTA: 'Start Free 14-Day Trial',
  accentColor: 'teal',
  painPoints: [
    {
      icon: Users,
      title: 'Low Student Engagement',
      description: 'Students zone out with cameras off and minimal participation'
    },
    {
      icon: BarChart,
      title: 'No Participation Visibility',
      description: 'Hard to track who\'s engaged and who needs extra attention'
    },
    {
      icon: Clock,
      title: 'Time-Consuming Admin Work',
      description: 'Hours spent creating quizzes, summaries, and follow-up materials'
    },
    {
      icon: Brain,
      title: 'Learning Gaps Go Unnoticed',
      description: 'Missing when students don\'t understand key concepts'
    }
  ],
  features: [
    {
      title: 'Real-Time Engagement Tracking',
      description: 'Monitor student attention, participation, and comprehension levels live',
      icon: BarChart
    },
    {
      title: 'Auto-Generated Quizzes',
      description: 'Create comprehension checks and quizzes based on lesson content instantly',
      icon: FileQuestion
    },
    {
      title: 'Smart Discussion Prompts',
      description: 'Get AI-suggested questions to spark meaningful class discussions',
      icon: MessageCircle
    },
    {
      title: 'Automated Class Summaries',
      description: 'Send students detailed recaps with key concepts and resources',
      icon: BookOpen
    },
    {
      title: 'Individual Progress Tracking',
      description: 'Identify struggling students and provide targeted support',
      icon: Target
    },
    {
      title: 'Interactive Learning Analytics',
      description: 'Visualize class performance and adjust teaching strategies in real-time',
      icon: TrendingUp
    }
  ],
  integrations: [
    { name: 'Zoom' },
    { name: 'Canvas' },
    { name: 'Moodle' },
    { name: 'Google Classroom' },
    { name: 'Microsoft Teams' },
    { name: 'Blackboard' }
  ],
  testimonials: [
    {
      quote: "Student engagement increased by 65%. The AI helps me spot when students are confused and suggests perfect follow-up questions.",
      author: "Dr. Emily Chen",
      role: "Professor of Biology",
      company: "State University"
    },
    {
      quote: "I save 5+ hours per week on admin tasks. The auto-generated quizzes and summaries are better than what I used to create manually.",
      author: "Robert Taylor",
      role: "High School Math Teacher",
      company: "Lincoln Academy"
    },
    {
      quote: "The participation tracking transformed my online classes. I can now give every student the attention they need to succeed.",
      author: "Maria Gonzalez",
      role: "Corporate Trainer",
      company: "Fortune 500 Training Institute"
    }
  ],
  stats: [
    { value: '65%', label: 'Higher engagement rates' },
    { value: '5hrs', label: 'Saved weekly per educator' },
    { value: '85%', label: 'Student satisfaction score' },
    { value: '2x', label: 'More class participation' }
  ],
  faqs: [
    {
      question: 'How does engagement tracking work?',
      answer: 'The AI analyzes verbal participation, chat activity, and response patterns to gauge engagement. You get a real-time dashboard showing which students are actively engaged and who might need encouragement.'
    },
    {
      question: 'Can I customize the auto-generated content?',
      answer: 'Yes! Set your learning objectives and the AI creates quizzes, summaries, and discussion prompts aligned with your curriculum. Everything is editable before sending to students.'
    },
    {
      question: 'Does it work with my existing LMS?',
      answer: 'We integrate with Canvas, Moodle, Google Classroom, and more. Student data, grades, and materials sync automatically with your existing systems.'
    },
    {
      question: 'Is student data private and secure?',
      answer: 'Absolutely. We\'re FERPA compliant and use end-to-end encryption. Student data is never used for AI training and you control all data retention policies.'
    },
    {
      question: 'Can it help with different teaching styles?',
      answer: 'The AI adapts to lecture-based, discussion-based, or activity-based classes. It provides relevant suggestions whether you\'re teaching kindergarten or graduate school.'
    }
  ],
  metaTitle: 'AI Teaching Assistant for Online Education | Virtual Classroom Tools | liveprompt.ai',
  metaDescription: 'Boost student engagement by 65% with AI-powered teaching tools. Real-time participation tracking, auto-generated quizzes, and smart summaries. Try free.',
  keywords: [
    'AI teaching assistant',
    'virtual classroom engagement',
    'online education tools',
    'student participation tracking',
    'automated quiz generator',
    'educational AI platform',
    'remote learning software',
    'teacher productivity tools',
    'classroom analytics',
    'education technology AI'
  ]
}