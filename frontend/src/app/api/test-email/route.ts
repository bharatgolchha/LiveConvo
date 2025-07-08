import { NextRequest, NextResponse } from 'next/server';
import { sendPostCallNotification } from '@/lib/services/email/postCallNotification';
import { EnhancedSummary } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Sample summary data for testing
    const testSummary: EnhancedSummary = {
      tldr: "This was a productive meeting where we discussed the new product roadmap, identified key milestones for Q1 2024, and assigned action items to team members. The team showed strong alignment on priorities and timeline.",
      key_points: [
        "Product launch scheduled for March 2024",
        "Budget approved for additional engineering resources",
        "New feature prioritization agreed upon",
        "Marketing campaign timeline established"
      ],
      action_items: [
        {
          description: "Finalize technical specifications for the new API",
          owner: "John Smith",
          deadline: "2024-01-15"
        },
        {
          description: "Prepare budget breakdown for Q1 marketing spend",
          owner: "Sarah Johnson",
          deadline: "2024-01-10"
        },
        {
          description: "Schedule stakeholder review meeting",
          owner: "Mike Wilson",
          deadline: "2024-01-08"
        }
      ],
      outcomes: [
        "Approved $500K budget for Q1 initiatives",
        "Decided to postpone feature X to Q2",
        "Agreed on weekly sync meetings"
      ],
      next_steps: [
        "Engineering to begin sprint planning for new features",
        "Marketing to draft campaign creative brief",
        "Finance to update budget allocations"
      ],
      insights: [
        {
          observation: "Team morale is high with clear excitement about the new product direction",
          evidence: "Multiple team members expressed enthusiasm during the discussion",
          recommendation: "Maintain this momentum by providing regular updates on progress"
        },
        {
          observation: "Some concerns about timeline feasibility were raised but addressed through resource reallocation",
          evidence: "Initial estimates showed a 2-week delay",
          recommendation: "Monitor progress closely and adjust resources as needed"
        }
      ],
      quotable_quotes: [
        {
          quote: "This is exactly the kind of innovation our customers have been asking for",
          speaker: "Sarah Johnson",
          context: "Discussing the new feature set"
        },
        {
          quote: "Let's make sure we're not over-promising on the timeline",
          speaker: "Mike Wilson",
          context: "During timeline discussion"
        }
      ],
      missed_opportunities: [],
      successful_moments: [
        "Excellent facilitation kept the meeting on track",
        "All participants actively contributed to discussions"
      ],
      conversation_dynamics: {
        rapport_level: "excellent",
        engagement_quality: "high",
        dominant_speaker: "balanced",
        pace: "moderate",
        tone: "formal"
      },
      effectiveness_metrics: {
        objective_achievement: 95,
        communication_clarity: 90,
        participant_satisfaction: 88,
        overall_success: 91
      },
      agenda_coverage: {
        items_covered: ["Budget review", "Timeline planning", "Resource allocation"],
        items_missed: [],
        unexpected_topics: ["Partnership opportunities"]
      },
      coaching_recommendations: []
    };

    const testData = {
      sessionId: "test-session-123",
      userId: "test-user-123",
      userEmail: "bgolchha@gmail.com",
      sessionTitle: "Q1 2024 Product Planning Meeting",
      sessionDate: new Date(),
      duration: 2700, // 45 minutes
      participants: {
        me: "Bharat Golchha",
        them: "Product Team"
      },
      summary: testSummary,
      conversationType: "Team Meeting",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    };

    console.log('📧 Sending test email to:', testData.userEmail);
    
    const result = await sendPostCallNotification(testData);
    
    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testData.userEmail}`,
      result
    });
    
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test email endpoint',
    usage: 'Send a POST request to this endpoint to send a test email to bgolchha@gmail.com'
  });
}