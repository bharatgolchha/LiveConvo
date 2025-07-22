import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import readingTime from 'reading-time'
import { BlogPost, BlogPostMeta } from '@/types/blog'
import { authors } from './authors'

const postsDirectory = path.join(process.cwd(), 'content/blog')

export function getPostSlugs() {
  try {
    return fs.readdirSync(postsDirectory).filter(file => file.endsWith('.mdx'))
  } catch (error) {
    console.error('Error reading blog posts directory:', error)
    return []
  }
}

export function getPostBySlug(slug: string): BlogPostMeta | null {
  try {
    const realSlug = slug.replace(/\.mdx$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.mdx`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    const author = authors[data.author] || authors['team-liveprompt']
    const readTime = readingTime(content)
    
    return {
      slug: realSlug,
      title: data.title,
      description: data.description,
      date: data.date,
      author,
      category: data.category,
      tags: data.tags || [],
      readingTime: readTime.text,
      featured: data.featured || false,
      published: data.published !== false,
      content,
    }
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

export function getAllPosts(): BlogPost[] {
  const slugs = getPostSlugs()
  const posts = slugs
    .map((slug) => {
      const post = getPostBySlug(slug)
      if (!post) return null
      const { content, ...postWithoutContent } = post
      return postWithoutContent
    })
    .filter((post): post is BlogPost => post !== null && post.published)
    .sort((post1, post2) => (new Date(post2.date) > new Date(post1.date) ? 1 : -1))
  
  return posts
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter(post => post.category === category)
}

export function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts().filter(post => post.tags.includes(tag))
}

export function getRelatedPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const currentPost = getPostBySlug(currentSlug)
  if (!currentPost) return []
  
  const allPosts = getAllPosts().filter(post => post.slug !== currentSlug)
  
  // Score posts based on shared tags and category
  const scoredPosts = allPosts.map(post => {
    let score = 0
    
    // Same category gets 2 points
    if (post.category === currentPost.category) score += 2
    
    // Each shared tag gets 1 point
    const sharedTags = post.tags.filter(tag => currentPost.tags.includes(tag))
    score += sharedTags.length
    
    return { post, score }
  })
  
  // Sort by score and return top posts
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post)
}

export async function markdownToHtml(markdown: string) {
  const result = await remark().use(html).process(markdown)
  return result.toString()
}

export function getAllTags(): string[] {
  const posts = getAllPosts()
  const tagSet = new Set<string>()
  
  posts.forEach(post => {
    post.tags.forEach(tag => tagSet.add(tag))
  })
  
  return Array.from(tagSet).sort()
}

export function getAllCategories(): string[] {
  const posts = getAllPosts()
  const categorySet = new Set<string>()
  
  posts.forEach(post => {
    categorySet.add(post.category)
  })
  
  return Array.from(categorySet).sort()
}