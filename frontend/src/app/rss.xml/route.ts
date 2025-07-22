import { getAllPosts } from '@/lib/blog/utils'
import RSS from 'rss'

export async function GET() {
  const posts = getAllPosts()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://liveprompt.ai'

  const feed = new RSS({
    title: 'LivePrompt.ai Blog',
    description: 'Insights on AI, sales, productivity, and real-time conversation intelligence.',
    site_url: siteUrl,
    feed_url: `${siteUrl}/rss.xml`,
    copyright: `${new Date().getFullYear()} LivePrompt.ai`,
    language: 'en',
    pubDate: new Date(),
    ttl: 60,
  })

  posts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.description,
      url: `${siteUrl}/blog/${post.slug}`,
      guid: `${siteUrl}/blog/${post.slug}`,
      categories: [post.category, ...post.tags],
      date: new Date(post.date),
      author: post.author.name,
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}