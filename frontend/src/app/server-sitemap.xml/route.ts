import { getServerSideSitemap } from 'next-sitemap'
import { getAllPosts } from '@/lib/blog/utils'

export async function GET(request: Request) {
  const posts = getAllPosts()
  
  const blogFields = posts.map((post) => ({
    loc: `https://liveprompt.ai/blog/${post.slug}`,
    lastmod: new Date(post.date).toISOString(),
    changefreq: 'weekly',
    priority: 0.7,
  }))

  return getServerSideSitemap(blogFields)
}