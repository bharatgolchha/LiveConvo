# Landing Page Strategy and Sitemap

## Overview
LiveConvo's current index page highlights generic benefits of real-time AI coaching during calls. To improve SEO, conversion rates, and ad relevance we should spin off dedicated landing pages that speak directly to our highest-value use cases. Each page will reuse the shared layout/components but tailor the hero, pain points, copy, imagery, and FAQs to a single persona.

## Core Use-Case Landing Pages
| # | Proposed URL | Primary Persona | Pain Points Addressed | Unique Value Proposition | Key SEO Keywords |
|---|--------------|-----------------|-----------------------|--------------------------|------------------|
| 1 | `/solutions/sales` | SaaS & B2B Account Executives, SDRs | Missed discovery questions, objection handling, note-taking overhead | Real-time AI prompts increase close rates & auto-generate next-steps | "AI sales call coach", "real-time sales assistant", "AI objection handling" |
| 2 | `/solutions/consulting` | Management & Strategy Consultants, Coaches | Manual note-taking, action items tracking, report prep | AI captures insights & drafts summaries so you bill for expertise, not notes | "AI meeting notes", "consulting call summaries", "client call AI" |
| 3 | `/solutions/recruiting` | Hiring Managers, Recruiters | Inconsistent interviewing, bias, missed red-flags | Live follow-up questions & candidate scorecards | "AI interview assistant", "recruiting call AI", "interview question generator" |
| 4 | `/solutions/support` | Customer Success & Support Leads | Repetitive troubleshooting, long handle times | Suggested responses & auto-log tickets during calls | "AI customer support calls", "real-time support assistant" |
| 5 | `/solutions/education` | Online Instructors, Corporate Trainers | Engagement drop-off, manual recap emails | AI generates quizzes, recaps & engagement cues | "AI virtual classroom", "online teaching assistant AI" |

### Content Blueprint for Each Page
1. Hero headline that states outcome for persona (e.g. "Close more deals with an AI sales coach in your ear.")
2. 3-4 bullet pain-points with persona-specific icons
3. Short product demo GIF/WebM focusing on persona workflow
4. Testimonials relevant to persona (pull from database by tag)
5. Feature grid (3-5 items) mapped to pain-points
6. Simple pricing teaser + CTA button ("Start Free 14-Day Trial")
7. Persona-specific FAQ section (3-5 questions)
8. Secondary CTA (newsletter, ebook, etc.)

Reusable sections (footer, nav, waitlist modal) remain shared.

## Extended Pages (Later Phases)
* `/solutions/healthcare` – Tele-medicine doctors & therapists (HIPAA copy needed)
* `/solutions/legal` – Lawyers & depositions
* `/solutions/real-estate` – Realtors & property tours

## High-Level Sitemap
```
/
/pricing
/login  (→ /auth/login)
/signup (→ /auth/signup)
/solutions/
    sales
    consulting
    recruiting
    support
    education
/features                # generic feature breakdown (future)
/demo                    # interactive playground (future)
/docs                    # public docs / knowledge base (future)
/privacy
/terms
/security
/status
/blog/                   # Ghost/MDX blog root (future)
    {slug}
```

## Next Steps
1. **Design**: Create Figma variants for each persona hero & demo section (due 2025-06-25).
2. **Content**: Draft copy & FAQs with keyword research (due 2025-06-26).
3. **Implementation**: Generate Next.js route groups under `src/app/solutions/*` using the shared `LandingTemplate` component (due 2025-06-30).
4. **SEO**: Add OpenGraph, JSON-LD, and sitemap updates (auto-generated in `next-sitemap.config.js`).

---
Owner: Growth/Marketing  
Author: AI assistant – 2025-06-19 