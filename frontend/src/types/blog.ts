export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: Author
  category: BlogCategory
  tags: string[]
  readingTime: string
  featured?: boolean
  published: boolean
}

export interface Author {
  name: string
  avatar: string
  bio?: string
  role?: string
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
}

export type BlogCategory = 
  | 'AI & Technology'
  | 'Sales & Marketing'
  | 'Productivity'
  | 'Customer Success'
  | 'Product Updates'
  | 'Case Studies'
  | 'Recruiting'
  | 'Best Practices'

export interface BlogPostMeta extends BlogPost {
  content: string
}