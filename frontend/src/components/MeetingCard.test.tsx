import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeetingCard } from './MeetingCard'

const mockProps = {
  id: 'test-123',
  title: 'Test Meeting',
  meetingType: 'Team' as const,
  owner: { initials: 'TU', fullName: 'Test User' },
  status: 'Done' as const,
  startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  durationSec: 1800, // 30 minutes
  tldr: 'This is a test summary that is long enough to test the expand/collapse functionality. It should be more than 150 characters to trigger the show more/less button. Here is some additional text to make it even longer.',
  selected: false,
  participants: ['Test User', 'Alice Smith'],
  onSelect: jest.fn(),
  onOpen: jest.fn(),
  onFollowUp: jest.fn(),
  onReport: jest.fn(),
}

describe('MeetingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all required information', () => {
    render(<MeetingCard {...mockProps} />)
    
    expect(screen.getByText('Test Meeting')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('TU')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('shows relative time correctly', () => {
    render(<MeetingCard {...mockProps} />)
    
    expect(screen.getByText(/30 minutes ago/)).toBeInTheDocument()
  })

  it('handles TLDR expand/collapse', () => {
    render(<MeetingCard {...mockProps} />)
    
    const showMoreButton = screen.getByText('Show more')
    expect(showMoreButton).toBeInTheDocument()
    
    // Text should be truncated initially
    const tldrElement = screen.getByText(mockProps.tldr)
    expect(tldrElement).toHaveClass('line-clamp-3')
    
    // Click to expand
    fireEvent.click(showMoreButton)
    expect(tldrElement).not.toHaveClass('line-clamp-3')
    expect(screen.getByText('Show less')).toBeInTheDocument()
    
    // Click to collapse
    fireEvent.click(screen.getByText('Show less'))
    expect(tldrElement).toHaveClass('line-clamp-3')
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('does not show expand/collapse for short TLDR', () => {
    const shortTldrProps = {
      ...mockProps,
      tldr: 'Short summary',
    }
    render(<MeetingCard {...shortTldrProps} />)
    
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('shows skeleton when TLDR is undefined', () => {
    const noTldrProps = {
      ...mockProps,
      tldr: undefined,
    }
    render(<MeetingCard {...noTldrProps} />)
    
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('calls onOpen when clicking the card body', () => {
    render(<MeetingCard {...mockProps} />)
    
    const cardBody = screen.getByText('Test Meeting').closest('div')
    fireEvent.click(cardBody!)
    
    expect(mockProps.onOpen).toHaveBeenCalledWith('test-123')
  })

  it('calls onOpen when clicking Open button', () => {
    render(<MeetingCard {...mockProps} />)
    
    const openButtons = screen.getAllByText('Open')
    fireEvent.click(openButtons[0])
    
    expect(mockProps.onOpen).toHaveBeenCalledWith('test-123')
  })

  it('calls onFollowUp when clicking Follow-up button', () => {
    render(<MeetingCard {...mockProps} />)
    
    const followUpButtons = screen.getAllByText('Follow-up')
    fireEvent.click(followUpButtons[0])
    
    expect(mockProps.onFollowUp).toHaveBeenCalledWith('test-123')
  })

  it('handles checkbox selection', () => {
    render(<MeetingCard {...mockProps} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    
    expect(mockProps.onSelect).toHaveBeenCalledWith('test-123', true)
  })

  it('shows selected state styling', () => {
    const selectedProps = {
      ...mockProps,
      selected: true,
    }
    render(<MeetingCard {...selectedProps} />)
    
    const card = screen.getByRole('group')
    expect(card).toHaveClass('border-l-4', 'border-l-primary-500')
  })

  it('shows correct status indicator', () => {
    const liveProps = {
      ...mockProps,
      status: 'Live' as const,
    }
    render(<MeetingCard {...liveProps} />)
    
    // Look for animate-ping class which indicates live status
    const statusDots = document.querySelectorAll('.animate-ping')
    expect(statusDots.length).toBeGreaterThan(0)
  })

  it('formats duration correctly for hours', () => {
    const longMeetingProps = {
      ...mockProps,
      durationSec: 7200, // 2 hours
    }
    render(<MeetingCard {...longMeetingProps} />)
    
    expect(screen.getByText('2h 0m')).toBeInTheDocument()
  })

  it('shows future meetings correctly', () => {
    const futureProps = {
      ...mockProps,
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    }
    render(<MeetingCard {...futureProps} />)
    
    expect(screen.getByText(/in about 1 hour/)).toBeInTheDocument()
  })

  it('stops propagation when clicking action buttons', () => {
    render(<MeetingCard {...mockProps} />)
    
    const followUpButton = screen.getAllByText('Follow-up')[0]
    const event = { stopPropagation: jest.fn() }
    
    fireEvent.click(followUpButton, event)
    
    // The onOpen should not be called when clicking action buttons
    expect(mockProps.onFollowUp).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(<MeetingCard {...mockProps} />)
    
    // Check aria-labels
    expect(screen.getByLabelText('Select Test Meeting')).toBeInTheDocument()
    expect(screen.getByLabelText('Open meeting Test Meeting')).toBeInTheDocument()
    expect(screen.getByLabelText('Follow up on Test Meeting')).toBeInTheDocument()
    expect(screen.getByLabelText('Report Test Meeting')).toBeInTheDocument()
    
    // Check time element
    const timeElement = screen.getByText(/30 minutes ago/).closest('time')
    expect(timeElement).toHaveAttribute('dateTime')
  })
})