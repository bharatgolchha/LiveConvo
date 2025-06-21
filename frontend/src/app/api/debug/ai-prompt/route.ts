import { NextRequest, NextResponse } from 'next/server';

function getChatGuidanceSystemPrompt(
  conversationType?: string, 
  isRecording: boolean = false, 
  transcriptLength: number = 0, 
  participantMe?: string, 
  participantThem?: string,
  meetingTitle?: string,
  meetingContext?: string,
  meetingUrl?: string
): string {
  const live = isRecording && transcriptLength > 0;
  const modeDescriptor = live ? '🎥 LIVE (conversation in progress)' : '📝 PREP (planning before the call)';
  const meLabel = participantMe || 'You';
  const themLabel = participantThem || 'The other participant';

  // Build meeting context section
  let meetingContextSection = '';
  if (meetingTitle || meetingContext || meetingUrl) {
    meetingContextSection = '\nMEETING DETAILS:\n';
    if (meetingTitle) meetingContextSection += `- Title: "${meetingTitle}"\n`;
    if (meetingContext) meetingContextSection += `- Context/Purpose: ${meetingContext}\n`;
    if (meetingUrl) meetingContextSection += `- Meeting Platform: ${meetingUrl}\n`;
    meetingContextSection += '\n';
  }

  return `You are ${meLabel}'s helpful AI meeting advisor. Your job is to be genuinely useful - answer questions directly, give practical advice, and help ${meLabel} navigate their conversation with ${themLabel}.

CURRENT SITUATION: ${modeDescriptor}${meetingContextSection}
BE CONVERSATIONAL AND HELPFUL:
- Answer questions directly and practically
- Give specific advice based on what's actually happening
- Reference the transcript when relevant (e.g., "When ${themLabel} mentioned X, that suggests...")
- Use the meeting context and purpose to provide more targeted advice
- If asked "who said what", just summarize the key points from each person
- Keep responses under 100 words unless more detail is genuinely needed
- Write like you're a smart colleague, not a formal coach

EXAMPLES OF GOOD RESPONSES:
- "Based on the transcript, ${themLabel} seems most interested in the pricing discussion. I'd focus on that next."
- "Here's what happened: ${meLabel} asked about timeline, ${themLabel} said they need it by March. You should clarify if that's flexible."
- "The conversation stalled when ${themLabel} mentioned budget concerns. Try asking what specific budget range they're working with."
- "Given this meeting is about [meeting purpose], you should focus on [specific advice based on context]."

Just be helpful and direct. No coaching jargon, no meta-commentary about being a coach.`;
}

export async function GET(request: NextRequest) {
  // Sample meeting data to demonstrate the prompt
  const sampleMeetingData = {
    title: "Q4 Sales Strategy Review",
    context: "Quarterly review meeting to discuss sales performance, identify challenges, and plan strategies for Q4. Key attendees include sales team leads and regional managers.",
    meetingUrl: "https://zoom.us/j/123456789",
    conversationType: "meeting",
    isRecording: true,
    transcriptLength: 25,
    participantMe: "Sarah (Sales Director)",
    participantThem: "Regional Sales Team"
  };

  const systemPrompt = getChatGuidanceSystemPrompt(
    sampleMeetingData.conversationType,
    sampleMeetingData.isRecording,
    sampleMeetingData.transcriptLength,
    sampleMeetingData.participantMe,
    sampleMeetingData.participantThem,
    sampleMeetingData.title,
    sampleMeetingData.context,
    sampleMeetingData.meetingUrl
  );

  const smartNotesExample = `SMART NOTES (last 3):
1. (action) Follow up with John about the Q3 pipeline review by Friday
2. (insight) Regional performance varies significantly - West Coast up 15%, East Coast down 8%
3. (decision) Implement new lead scoring system starting next month`;

  return NextResponse.json({
    message: "AI Advisor System Prompt Debug",
    sampleMeetingData,
    systemPrompt,
    smartNotesExample,
    promptLength: systemPrompt.length,
    explanation: "This shows exactly what context the AI advisor receives about your meeting. The prompt includes meeting title, context/purpose, platform URL, participant names, and smart notes from the conversation."
  });
} 