export interface SolutionData {
  id: string
  title: string
  subtitle: string
  heroHeadline: string
  heroSubheadline: string
  heroCTA: string
  accentColor: string
  painPoints: {
    icon: React.ElementType
    title: string
    description: string
  }[]
  features: {
    title: string
    description: string
    icon: React.ElementType
  }[]
  integrations: {
    name: string
    logo?: string
  }[]
  testimonials: {
    quote: string
    author: string
    role: string
    company: string
    avatar?: string
  }[]
  stats: {
    value: string
    label: string
  }[]
  faqs: {
    question: string
    answer: string
  }[]
  metaTitle: string
  metaDescription: string
  keywords: string[]
}