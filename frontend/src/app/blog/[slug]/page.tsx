import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog/utils'
import BlogPostContent from '@/components/blog/BlogPostContent'

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: 'Post Not Found | LivePrompt.ai',
    }
  }

  return {
    title: `${post.title} | LivePrompt.ai Blog`,
    description: post.description,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author.name],
      url: `https://liveprompt.ai/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)
  
  if (!post || !post.published) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(params.slug, 3)

  return <BlogPostContent post={post} relatedPosts={relatedPosts} />
}