'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BlogPost, BlogCategory } from '@/types/blog'
import { Calendar, Clock, Tag, Rss } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

interface BlogListingProps {
  posts: BlogPost[]
  categories: string[]
  tags: string[]
}

export default function BlogListing({ posts, categories, tags }: BlogListingProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = useMemo(() => {
    let filtered = posts

    if (selectedCategory) {
      filtered = filtered.filter(post => post.category === selectedCategory)
    }

    if (selectedTag) {
      filtered = filtered.filter(post => post.tags.includes(selectedTag))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        post =>
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [posts, selectedCategory, selectedTag, searchQuery])

  const featuredPosts = posts.filter(post => post.featured).slice(0, 3)

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background pt-24 pb-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              LivePrompt Blog
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Insights on AI, sales, productivity, and real-time conversation intelligence
            </p>
            <Link
              href="/rss.xml"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Rss className="h-4 w-4" />
              Subscribe via RSS
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && !selectedCategory && !selectedTag && !searchQuery && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-8">Featured Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-border"
                >
                  <div className="p-6">
                    <span className="text-sm text-primary mb-2 block">{post.category}</span>
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{post.description}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(post.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</span>
                      <Clock className="h-4 w-4 ml-4 mr-1" />
                      <span>{post.readingTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Categories */}
                <div className="mb-8">
                  <h3 className="font-semibold text-foreground mb-4">Categories</h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`text-left w-full px-3 py-2 rounded-md transition-colors ${
                          !selectedCategory
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        All Categories
                      </button>
                    </li>
                    {categories.map((category) => (
                      <li key={category}>
                        <button
                          onClick={() => setSelectedCategory(category)}
                          className={`text-left w-full px-3 py-2 rounded-md transition-colors ${
                            selectedCategory === category
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {category}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Popular Tags */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Popular Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 12).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTag === tag
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Blog Posts */}
            <div className="lg:col-span-3">
              {/* Active Filters */}
              {(selectedCategory || selectedTag) && (
                <div className="mb-6 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filters:</span>
                  {selectedCategory && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="ml-2 hover:text-primary/80"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedTag && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      {selectedTag}
                      <button
                        onClick={() => setSelectedTag(null)}
                        className="ml-2 hover:text-primary/80"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Results Count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
                </p>
              </div>

              {/* Posts Grid */}
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-sm font-medium text-primary">
                            {post.category}
                          </span>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{new Date(post.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{post.readingTime}</span>
                          </div>
                        </div>
                        
                        <Link href={`/blog/${post.slug}`}>
                          <h2 className="text-2xl font-semibold text-foreground mb-2 hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                        </Link>
                        
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {post.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {post.author.avatar && (
                              <img 
                                src={post.author.avatar} 
                                alt={post.author.name}
                                className="w-10 h-10 rounded-full"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {post.author.name}
                              </p>
                              {post.author.role && (
                                <p className="text-xs text-muted-foreground">{post.author.role}</p>
                              )}
                            </div>
                          </div>
                          
                          <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
                          >
                            Read more
                          </Link>
                        </div>

                        {post.tags.length > 0 && (
                          <div className="mt-4 flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground/60" />
                            <div className="flex flex-wrap gap-2">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* No Results */}
              {filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No articles found matching your criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory(null)
                      setSelectedTag(null)
                      setSearchQuery('')
                    }}
                    className="text-primary hover:text-primary/80 font-medium">
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}