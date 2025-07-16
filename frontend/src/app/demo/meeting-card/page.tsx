'use client'

import { MeetingCard } from '@/components/MeetingCard'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Moon, Sun } from 'lucide-react'

export default function MeetingCardDemo() {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const { resolvedTheme, toggleTheme } = useTheme()

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCards)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedCards(newSelected)
  }

  const meetings = [
    {
      id: '1',
      title: 'Q4 Product Planning Session',
      meetingType: 'Team' as const,
      owner: { initials: 'JD', fullName: 'John Doe' },
      status: 'Live' as const,
      startTime: new Date(),
      durationSec: 1800,
      tldr: 'Discussing Q4 roadmap priorities including AI feature enhancements, performance optimization, and new dashboard analytics.',
    },
    {
      id: '2',
      title: 'Sales Team Weekly Sync',
      meetingType: 'Sales' as const,
      owner: { initials: 'SJ', fullName: 'Sarah Johnson' },
      status: 'Done' as const,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      durationSec: 3600,
      tldr: 'Reviewed weekly sales metrics, discussed pipeline updates, and aligned on Q4 targets. Key action items: follow up with enterprise leads, prepare demo for Acme Corp, update CRM with latest deal stages.',
    },
    {
      id: '3',
      title: 'Client Demo - Acme Corp',
      meetingType: 'Demo' as const,
      owner: { initials: 'MR', fullName: 'Mike Rodriguez' },
      status: 'Action-Needed' as const,
      startTime: new Date(Date.now() - 45 * 60 * 1000),
      durationSec: 2700,
      tldr: 'Demonstrated key product features to Acme Corp team. Strong interest in AI capabilities and integration options. Need to provide pricing proposal and technical documentation by end of week.',
    },
    {
      id: '4',
      title: 'Interview - Senior Frontend Engineer',
      meetingType: 'Interview' as const,
      owner: { initials: 'TW', fullName: 'Tom Wilson' },
      status: 'Scheduled' as const,
      startTime: new Date(Date.now() + 30 * 60 * 1000),
      durationSec: 3600,
      tldr: undefined, // Loading state
    },
    {
      id: '5',
      title: 'Strategic Planning Session for Q1 2024 Product Roadmap and Resource Allocation',
      meetingType: 'Board Meeting' as const,
      owner: { initials: 'EP', fullName: 'Emily Parker' },
      status: 'Done' as const,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      durationSec: 7200,
      tldr: 'Comprehensive discussion covering multiple strategic initiatives including: 1) Q1 2024 product roadmap with emphasis on AI-driven features and machine learning capabilities, 2) Performance optimization strategies focusing on database query optimization and front-end rendering improvements, 3) New dashboard analytics features incorporating real-time data visualization and customizable widgets, 4) Resource allocation for the upcoming quarter with special attention to hiring needs and budget constraints, 5) Technical debt reduction plan spanning two full sprints with specific focus on legacy code refactoring and test coverage improvements.',
    },
  ]

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">Meeting Card Component Demo</h1>
            <p className="text-muted-foreground">
              LivePrompt Meeting Card 2.0 - All states and variations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="flex items-center gap-2"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" />
                Light
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              {...meeting}
              selected={selectedCards.has(meeting.id)}
              onSelect={handleSelect}
              onOpen={(id) => alert(`Opening meeting ${id}`)}
              onFollowUp={(id) => alert(`Creating follow-up for meeting ${id}`)}
              onReport={(id) => alert(`Generating report for meeting ${id}`)}
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-card rounded-lg shadow border border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Component Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2 text-foreground">Visual States</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Live (with pulsing indicator)</li>
                <li>• Done (green indicator)</li>
                <li>• Action Needed (amber badge)</li>
                <li>• Scheduled (gray indicator)</li>
                <li>• Selected (left border accent)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-foreground">Interactions</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click card body to open</li>
                <li>• Checkbox for bulk selection</li>
                <li>• Show more/less for long summaries</li>
                <li>• Hover effects with subtle lift</li>
                <li>• Mobile responsive layout</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-primary">
            💡 Try resizing your browser to see the mobile layout adaptation
          </p>
        </div>
      </div>
    </div>
  )
}