'use client'

import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { useEffect, useState } from 'react'
import { BlogPostMeta, BlogPost } from '@/types/blog'
import { Calendar, Clock, ChevronLeft, Tag, Share2, Twitter, Linkedin, Copy } from 'lucide-react'
import { HTMLAttributes, DetailedHTMLProps } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { BlogJsonLd } from '@/components/blog/BlogJsonLd'
import ROICalculator from '@/components/blog/ROICalculator'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'

interface BlogPostContentProps {
  post: BlogPostMeta
  relatedPosts: BlogPost[]
}

type HeadingProps = DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
type ParagraphProps = DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
type ListProps = DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
type ListItemProps = DetailedHTMLProps<HTMLAttributes<HTMLLIElement>, HTMLLIElement>;
type BlockquoteProps = DetailedHTMLProps<HTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>;
type CodeProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { inline?: boolean };
type PreProps = DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
type AnchorProps = DetailedHTMLProps<HTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

const components = {
  h1: (props: HeadingProps) => <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground" {...props} />,
  h2: (props: HeadingProps) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground" {...props} />,
  h3: (props: HeadingProps) => <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props} />,
  p: (props: ParagraphProps) => <p className="mb-4 text-muted-foreground leading-relaxed" {...props} />,
  ul: (props: ListProps) => <ul className="mb-4 ml-6 list-disc text-muted-foreground" {...props} />,
  ol: (props: ListProps) => <ol className="mb-4 ml-6 list-decimal text-muted-foreground" {...props} />,
  li: (props: ListItemProps) => <li className="mb-2" {...props} />,
  blockquote: (props: BlockquoteProps) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
  ),
  code: ({ inline, ...props }: CodeProps) => 
    inline ? (
      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />
    ) : (
      <code className="block bg-card border border-border text-foreground p-4 rounded-lg overflow-x-auto font-mono text-sm" {...props} />
    ),
  pre: (props: PreProps) => <pre className="mb-4" {...props} />,
  a: (props: AnchorProps) => (
    <a className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  ROICalculator: ROICalculator,
}

export default function BlogPostContent({ post, relatedPosts }: BlogPostContentProps) {
  const [mdxSource, setMdxSource] = useState<{ compiledSource: string; frontmatter?: Record<string, unknown> } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const serializeContent = async () => {
      const mdx = await serialize(post.content, {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, rehypeHighlight],
        },
      })
      setMdxSource(mdx)
    }
    serializeContent()
  }, [post.content])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleShare = async (platform: 'twitter' | 'linkedin' | 'copy') => {
    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        )
        break
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        )
        break
      case 'copy':
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
    }
  }

  return (
    <>
      <Header />
      <BlogJsonLd post={post} url={shareUrl} />
      
      <article className="pt-24 pb-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to Blog */}
            <Link
              href="/blog"
              className="inline-flex items-center text-primary hover:text-primary/80 mb-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Blog
            </Link>

            {/* Article Header */}
            <header className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {post.category}
                </span>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </time>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{post.readingTime}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {post.title}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                {post.description}
              </p>

              {/* Author Info */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  {post.author.avatar && (
                    <img 
                      src={post.author.avatar} 
                      alt={post.author.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{post.author.name}</p>
                    {post.author.role && (
                      <p className="text-sm text-muted-foreground">{post.author.role}</p>
                    )}
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Share:</span>
                  <button
                    onClick={() => handleShare('twitter')}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Share on Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare('copy')}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <span className="text-app-success text-sm">Copied!</span>
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

            </header>

            {/* Article Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {mdxSource && <MDXRemote {...mdxSource} components={components} />}
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-5 w-5 text-muted-foreground/60" />
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm hover:bg-muted/80 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author Bio */}
            {post.author.bio && (
              <div className="mt-12 p-6 bg-muted/50 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-3">About the Author</h3>
                <div className="flex items-start gap-4">
                  {post.author.avatar && (
                    <img 
                      src={post.author.avatar} 
                      alt={post.author.name}
                      className="w-16 h-16 rounded-full flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-foreground mb-1">{post.author.name}</p>
                    {post.author.role && (
                      <p className="text-sm text-muted-foreground mb-2">{post.author.role}</p>
                    )}
                    <p className="text-muted-foreground">{post.author.bio}</p>
                    {post.author.social && (
                      <div className="flex items-center gap-3 mt-3">
                        {post.author.social.twitter && (
                          <a
                            href={post.author.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {post.author.social.linkedin && (
                          <a
                            href={post.author.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Newsletter CTA */}
            <div className="mt-12 p-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground text-center">
              <h3 className="text-2xl font-bold mb-3">Stay Updated</h3>
              <p className="mb-6">
                Get the latest insights on AI and conversation intelligence delivered to your inbox.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-6 py-3 bg-background text-primary font-semibold rounded-lg hover:bg-muted transition-colors border border-border"
              >
                Sign up for free
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-border p-4"
                  >
                      <p className="text-sm text-primary mb-2">{relatedPost.category}</p>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{relatedPost.readingTime}</span>
                      </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  )
}