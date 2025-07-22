import { Metadata } from 'next'
import { getAllPosts, getAllCategories, getAllTags } from '@/lib/blog/utils'
import BlogListing from '@/components/blog/BlogListing'
import { BlogListingJsonLd } from '@/components/blog/BlogJsonLd'

export const metadata: Metadata = {
  title: 'Blog | LivePrompt.ai',
  description: 'Insights on AI, sales, productivity, and real-time conversation intelligence. Learn how to leverage AI to improve your conversations.',
  openGraph: {
    title: 'Blog | LivePrompt.ai',
    description: 'Insights on AI, sales, productivity, and real-time conversation intelligence.',
    type: 'website',
    url: 'https://liveprompt.ai/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | LivePrompt.ai',
    description: 'Insights on AI, sales, productivity, and real-time conversation intelligence.',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()
  const categories = getAllCategories()
  const tags = getAllTags()
  
  return (
    <div className="min-h-screen bg-background">
      <BlogListingJsonLd />
      <BlogListing 
        posts={posts}
        categories={categories}
        tags={tags}
      />
    </div>
  )
}