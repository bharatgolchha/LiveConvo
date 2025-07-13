export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'business' | 'technical' | 'communication' | 'analysis' | 'planning';
  suggestedFor?: string[];
}

export const CUSTOM_REPORT_TEMPLATES: ReportTemplate[] = [
  // Business Templates
  {
    id: 'executive-brief',
    name: 'Executive Brief',
    description: 'High-level summary for leadership',
    category: 'business',
    prompt: `Create an executive brief of this meeting with the following sections:

## Executive Summary
- 2-3 sentence overview of the meeting purpose and outcome
- Key business impact or value delivered

## Strategic Decisions
- List each major decision with:
  - The decision made
  - Business rationale
  - Expected impact
  - Decision maker/owner

## Financial & Resource Implications
- Budget impacts
- Resource allocation changes
- Investment requirements

## Risks & Mitigation
- Identified risks
- Proposed mitigation strategies

## Recommended Actions for Leadership
- Items requiring executive approval
- Strategic initiatives to consider
- Timeline for key decisions

Keep the language concise and focused on business impact.`,
    suggestedFor: ['sales', 'strategy', 'executive']
  },
  
  {
    id: 'project-status',
    name: 'Project Status Report',
    description: 'Progress and milestone tracking',
    category: 'planning',
    prompt: `Generate a comprehensive project status report with:

## Project Overview
- Project name and current phase
- Overall health status (Green/Yellow/Red)
- Timeline adherence

## Progress Since Last Update
- Completed milestones
- Key accomplishments
- Metrics/KPIs achieved

## Current Sprint/Phase Status
- In-progress items with % complete
- Blockers and dependencies
- Resource utilization

## Upcoming Milestones
- Next 2-4 weeks deliverables
- Critical path items
- Required decisions or approvals

## Risks & Issues
- New risks identified
- Issue status updates
- Mitigation actions in progress

## Resource & Budget Status
- Team capacity
- Budget burn rate
- Additional resource needs

## Key Decisions & Action Items
- Decisions made this period
- Open decisions needed
- Action items with owners and dates`,
    suggestedFor: ['project', 'standup', 'planning']
  },

  // Technical Templates
  {
    id: 'technical-documentation',
    name: 'Technical Documentation',
    description: 'Detailed technical decisions and implementation details',
    category: 'technical',
    prompt: `Create technical documentation from this meeting covering:

## Technical Decisions
- Architecture decisions with rationale
- Technology stack choices
- Design patterns selected
- Trade-offs considered

## Implementation Details
- Specific implementation approach
- Code structure/organization
- Integration points
- API contracts discussed

## Technical Requirements
- Functional requirements clarified
- Non-functional requirements (performance, security, scalability)
- Constraints and limitations

## Development Plan
- Implementation phases
- Technical milestones
- Testing strategy
- Deployment approach

## Technical Risks & Debt
- Identified technical risks
- Technical debt items
- Mitigation strategies
- Future refactoring needs

## Action Items
- Technical tasks with assignees
- Research items needed
- POCs to build
- Documentation to create`,
    suggestedFor: ['engineering', 'technical', 'architecture']
  },

  {
    id: 'bug-triage',
    name: 'Bug Triage Summary',
    description: 'Bug review and prioritization outcomes',
    category: 'technical',
    prompt: `Summarize the bug triage session:

## Triage Summary
- Total bugs reviewed
- Severity breakdown
- Assignment summary

## Critical/High Priority Bugs
For each P0/P1 bug:
- Bug ID and title
- Impact description
- Assigned to
- Target resolution date
- Workaround if available

## Bug Patterns Identified
- Common root causes
- Affected components
- Systemic issues found

## Process Improvements
- Quality initiatives discussed
- Testing gaps identified
- Prevention strategies

## Action Items
- Immediate fixes needed
- Process changes to implement
- Follow-up investigations`,
    suggestedFor: ['qa', 'engineering', 'support']
  },

  // Communication Templates
  {
    id: 'client-update',
    name: 'Client Update Email',
    description: 'Professional client-facing summary',
    category: 'communication',
    prompt: `Draft a professional client update email:

Subject: [Project Name] - Progress Update [Date]

Dear [Client Name],

I wanted to provide you with an update on our recent progress and discussions.

## Progress Highlights
- Key accomplishments since our last update
- Milestones achieved
- Deliverables completed

## Current Status
- What we're working on now
- Expected completion dates
- Any dependencies on client

## Upcoming Deliverables
- Next milestones
- Timeline for delivery
- What to expect

## Points Requiring Your Attention
- Decisions needed from your team
- Information/access required
- Upcoming reviews or approvals

## Challenges & Solutions
- Any challenges encountered (frame positively)
- Our approach to resolution
- Impact on timeline (if any)

## Next Steps
- Our immediate actions
- When you'll hear from us next
- Any actions needed from your side

Please let me know if you have any questions or would like to discuss any of these items in more detail.

Best regards,
[Your name]`,
    suggestedFor: ['client', 'sales', 'account']
  },

  {
    id: 'meeting-minutes',
    name: 'Formal Meeting Minutes',
    description: 'Official meeting documentation',
    category: 'communication',
    prompt: `Generate formal meeting minutes in standard format:

## Meeting Minutes

**Date:** [Extract from transcript]
**Time:** [Extract from transcript]
**Attendees:** [List all participants]
**Meeting Type:** [Type of meeting]
**Facilitator:** [If mentioned]

## Agenda Items Discussed

### 1. [First Topic]
**Discussion:**
- Key points raised
- Different perspectives shared
- Concerns or questions

**Decisions:**
- Decision made
- Rationale
- Vote count (if applicable)

**Action Items:**
- Action required
- Responsible party
- Due date

### 2. [Second Topic]
[Repeat format for each agenda item]

## Action Items Summary
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [List all actions] | | | |

## Decisions Summary
- [List all decisions with reference to agenda item]

## Items Tabled for Future Discussion
- [List any items deferred]

## Next Meeting
- Date: [If discussed]
- Agenda items to prepare: [If mentioned]

**Minutes prepared by:** [AI-Generated]
**Date prepared:** [Today's date]`,
    suggestedFor: ['board', 'formal', 'governance']
  },

  // Analysis Templates
  {
    id: 'sales-followup',
    name: 'Sales Call Analysis',
    description: 'Post-sales meeting insights and strategy',
    category: 'analysis',
    prompt: `Analyze this sales conversation and create a strategic follow-up plan:

## Prospect Overview
- Company and attendees
- Current situation/status
- Business objectives discussed

## Pain Points & Needs Analysis
- Primary pain points identified
- Business impact of these issues
- Urgency indicators
- Budget implications mentioned

## Solution Alignment
- How our solution addresses their needs
- Features that resonated most
- Value propositions that landed

## Objections & Concerns
- Objections raised
- Our responses
- Remaining concerns
- Competitive mentions

## Buying Signals
- Positive indicators observed
- Level of engagement
- Next steps requested by prospect
- Timeline discussions

## Competitive Landscape
- Competitors mentioned
- Our positioning
- Differentiators highlighted
- Advantages/disadvantages

## Deal Assessment
- Probability of close (High/Medium/Low)
- Estimated deal size
- Expected timeline
- Key decision makers

## Follow-up Strategy
- Immediate next steps (24-48 hours)
- Materials to send
- People to involve
- Meeting to schedule
- Long-term nurture plan if needed`,
    suggestedFor: ['sales', 'business-development', 'account']
  },

  {
    id: 'retrospective',
    name: 'Team Retrospective',
    description: 'Team performance and improvement insights',
    category: 'analysis',
    prompt: `Create a comprehensive retrospective summary:

## Retrospective Overview
- Sprint/Period reviewed
- Team participants
- Overall sentiment

## What Went Well
- Successes and wins
- Effective practices
- Team achievements
- Positive collaborations

## What Could Be Improved
- Challenges faced
- Process bottlenecks
- Communication gaps
- Technical debt items

## Key Insights
- Root cause analysis of issues
- Patterns observed
- Team dynamics observations
- External factors impact

## Action Items for Improvement
For each improvement area:
- Specific action to take
- Owner assigned
- Success metrics
- Timeline for implementation

## Experiments to Try
- New practices to test
- Tools to evaluate
- Process changes to pilot
- Success criteria

## Team Health Metrics
- Morale indicators
- Velocity trends
- Quality metrics
- Collaboration effectiveness

## Appreciation & Recognition
- Team member contributions
- Achievements to celebrate
- Growth observed

## Next Retrospective Focus
- Items to follow up on
- Metrics to track
- Success indicators`,
    suggestedFor: ['agile', 'team', 'retrospective']
  },

  // Planning Templates
  {
    id: 'strategic-planning',
    name: 'Strategic Planning Session',
    description: 'Long-term strategy and planning outcomes',
    category: 'planning',
    prompt: `Summarize the strategic planning session:

## Strategic Context
- Current state assessment
- Market conditions discussed
- Competitive landscape
- Internal capabilities

## Vision & Objectives
- Long-term vision articulated
- Strategic objectives defined
- Success metrics identified
- Timeline horizons

## Strategic Initiatives
For each initiative:
- Initiative description
- Strategic rationale
- Expected outcomes
- Resource requirements
- Timeline
- Success metrics

## SWOT Analysis (if discussed)
- Strengths to leverage
- Weaknesses to address
- Opportunities to pursue
- Threats to mitigate

## Resource Allocation
- Budget considerations
- Team allocation
- Investment priorities
- Trade-offs made

## Risk Assessment
- Strategic risks identified
- Impact analysis
- Mitigation strategies
- Contingency plans

## Execution Roadmap
- Phase 1 priorities
- Quick wins identified
- Major milestones
- Decision gates

## Success Metrics & KPIs
- Leading indicators
- Lagging indicators
- Measurement frequency
- Reporting structure

## Governance & Review
- Steering committee
- Review cadence
- Decision rights
- Communication plan`,
    suggestedFor: ['strategy', 'planning', 'leadership']
  },

  {
    id: 'product-roadmap',
    name: 'Product Roadmap Review',
    description: 'Product planning and prioritization outcomes',
    category: 'planning',
    prompt: `Create a product roadmap review summary:

## Roadmap Overview
- Product vision discussed
- Time horizon reviewed
- Key themes identified

## Priority Features/Initiatives
For each major item:
- Feature/initiative name
- Customer problem solved
- Target user segment
- Expected impact
- Timeline/quarter
- Dependencies

## Trade-offs & Deprioritized Items
- What was moved out
- Rationale for decisions
- Impact of changes
- Stakeholder concerns

## Customer Insights
- Customer feedback discussed
- Market research findings
- Competitive analysis
- User pain points

## Technical Considerations
- Platform decisions
- Technical debt items
- Infrastructure needs
- Integration requirements

## Resource Planning
- Team allocation
- Skill gaps identified
- Hiring needs
- Budget requirements

## Success Metrics
- Product KPIs
- Feature success criteria
- Measurement plan
- Review cadence

## Stakeholder Alignment
- Key stakeholder concerns
- Alignment achieved
- Open questions
- Communication plan

## Next Steps
- Immediate actions
- Communication needed
- Preparation for next review
- Decisions needed before proceeding`,
    suggestedFor: ['product', 'planning', 'roadmap']
  }
];

// Helper function to get templates by category
export function getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return CUSTOM_REPORT_TEMPLATES.filter(template => template.category === category);
}

// Helper function to get suggested templates for a meeting type
export function getSuggestedTemplates(meetingType: string): ReportTemplate[] {
  const lowerType = meetingType.toLowerCase();
  return CUSTOM_REPORT_TEMPLATES.filter(template => 
    template.suggestedFor?.some(suggested => 
      lowerType.includes(suggested) || suggested.includes(lowerType)
    )
  );
}

// Helper function to get template by ID
export function getTemplateById(id: string): ReportTemplate | undefined {
  return CUSTOM_REPORT_TEMPLATES.find(template => template.id === id);
}