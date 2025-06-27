export interface MockTranscript {
  type: 'sales' | 'interview' | 'meeting' | 'support' | 'general';
  participants: {
    me: string;
    them: string;
  };
  duration: number; // in seconds
  transcript: string;
}

export const mockTranscripts: Record<string, MockTranscript> = {
  sales: {
    type: 'sales',
    participants: {
      me: 'Sarah Johnson',
      them: 'Michael Chen'
    },
    duration: 1800, // 30 minutes
    transcript: `Sarah Johnson: Hi Michael, thanks for taking the time to meet with me today. I'm Sarah from TechFlow Solutions. How are you doing?

Michael Chen: Hi Sarah, I'm doing well, thanks. I've been looking forward to this conversation. We've been exploring options to improve our data analytics capabilities.

Sarah Johnson: That's great to hear. Before we dive in, could you tell me a bit about your current analytics setup and what challenges you're facing?

Michael Chen: Sure. We're currently using a combination of Excel and some basic BI tools, but we're running into scalability issues. We process about 2 million transactions monthly, and our current system takes about 48 hours to generate monthly reports.

Sarah Johnson: 48 hours is quite significant. How is this impacting your business operations?

Michael Chen: It's becoming a real bottleneck. Our executives need these insights for strategic decisions, and the delay means we're often making decisions based on outdated data. We've actually lost two major opportunities last quarter because we couldn't respond quickly enough to market changes.

Sarah Johnson: That must be frustrating. What would an ideal solution look like for you?

Michael Chen: We need something that can process our data in near real-time, maybe within 2-3 hours max. Also, we need better visualization capabilities. Our CFO specifically mentioned wanting predictive analytics features.

Sarah Johnson: Those are exactly the kinds of problems TechFlow specializes in solving. Our platform can process your volume of data in under 30 minutes, and we have advanced ML models for predictive analytics. What's your timeline for implementing a solution?

Michael Chen: We're looking to make a decision by end of Q2, with implementation in Q3. Our budget is around $150,000 for the first year. Is that something that could work?

Sarah Johnson: That timeline and budget definitely align with what we can offer. Our enterprise package, which includes everything you mentioned, comes in at $12,000 per month, so $144,000 annually. This includes full implementation support and training.

Michael Chen: That sounds reasonable. What about integration with our existing systems? We use Salesforce for CRM and SAP for ERP.

Sarah Johnson: We have native integrations with both Salesforce and SAP. In fact, Johnson & Associates, one of our clients in your industry, saw a 65% reduction in reporting time after integrating with their SAP system.

Michael Chen: Impressive. Who are your other competitors we should be aware of?

Sarah Johnson: The main players in this space are DataViz Pro and AnalyticsCorp. However, our key differentiator is our real-time processing engine and our customer success team. We assign a dedicated success manager for the first 6 months.

Michael Chen: That's good to know. What would be the next steps if we wanted to move forward?

Sarah Johnson: I'd recommend starting with a proof of concept using your actual data. We can set that up within a week. Then, I'd love to arrange a meeting with your technical team and our solution architects to map out the integration plan. How does that sound?

Michael Chen: That sounds like a solid plan. Can you send me a detailed proposal with the POC timeline and what you'd need from our end?

Sarah Johnson: Absolutely. I'll have that over to you by end of day tomorrow. Should I include anyone else from your team on the email?

Michael Chen: Yes, please include our CTO, Jennifer Walsh, and our Head of Data, Robert Kim. Their emails are jwalsh@company.com and rkim@company.com.

Sarah Johnson: Perfect, I've got those noted. One last question - are there any specific KPIs or success metrics you'd use to evaluate the POC?

Michael Chen: Yes, we'd want to see report generation under 1 hour, 99.9% data accuracy, and the ability to handle at least 3 concurrent users running complex queries.

Sarah Johnson: Those are very reasonable benchmarks, and I'm confident we can exceed them. I'll make sure to highlight how we'll measure each of these in the proposal.

Michael Chen: Excellent. Thanks for your time today, Sarah. I'm looking forward to seeing the proposal.

Sarah Johnson: Thank you, Michael. I'm excited about the possibility of working together. I'll get that proposal over tomorrow, and we can schedule a follow-up call for early next week to discuss any questions. Have a great rest of your day!

Michael Chen: You too, Sarah. Talk soon.`
  },
  
  meeting: {
    type: 'meeting',
    participants: {
      me: 'Alex Rivera',
      them: 'Team Members'
    },
    duration: 2400, // 40 minutes
    transcript: `Alex Rivera: Good morning everyone. Let's start our product roadmap planning meeting. We have a lot to cover today. Lisa, can you start with the Q1 retrospective?

Lisa Wang: Sure, Alex. Q1 was strong overall. We shipped 15 out of 18 planned features, with a 94% uptime. User engagement increased by 23%, and our NPS score hit 72, up from 68 last quarter.

Alex Rivera: Excellent metrics. What about the 3 features we didn't ship?

Lisa Wang: The AI recommendation engine hit technical blockers - the ML model accuracy was only at 76%, below our 85% threshold. The mobile offline mode had sync issues we're still debugging. The third was the enterprise SSO integration, which got deprioritized for the security patch.

David Park: On the technical debt front, we reduced our critical vulnerabilities from 23 to 7. But we've accumulated about 400 hours of tech debt in the mobile codebase.

Alex Rivera: 400 hours is concerning. What's your recommendation, David?

David Park: We need to allocate at least 30% of our sprint capacity to tech debt in Q2, or we'll face serious performance issues by Q3.

Alex Rivera: Agreed. Let's make that a priority. Emma, what's the customer feedback telling us?

Emma Thompson: Top three requests remain consistent: better mobile experience, advanced filtering options, and real-time collaboration features. We've had 47 enterprise customers specifically request the collaboration features.

Alex Rivera: 47 enterprise customers is significant. What's the potential revenue impact?

Emma Thompson: Based on our pricing model, we're looking at approximately $2.3 million in additional ARR if we can deliver these features.

Marcus Chen: From a design perspective, I've completed mockups for the collaboration features. User testing showed 89% task completion rate, which is above our 85% benchmark.

Alex Rivera: Great work, Marcus. Now, let's talk Q2 priorities. Based on what we've discussed, I propose: 1) Real-time collaboration as our flagship feature, 2) Addressing the mobile tech debt, 3) Completing the AI recommendation engine.

Lisa Wang: I agree with those priorities, but we need to be realistic about capacity. With 30% going to tech debt, can we deliver all three?

David Park: My team can handle the tech debt and support collaboration features, but the AI engine might need to push to Q3.

Alex Rivera: Fair point. Let's commit to collaboration and tech debt for Q2, with AI engine as a stretch goal. Emma, can you work with sales to communicate this to those 47 enterprise customers?

Emma Thompson: Already drafting the communication. I'll have it ready by EOD.

Alex Rivera: Perfect. Now, let's discuss resource allocation. We have approval to hire 3 additional engineers. David, what skills do we need most?

David Park: We desperately need a senior mobile developer for the tech debt, a DevOps engineer for our scaling challenges, and ideally someone with real-time systems experience for the collaboration feature.

Alex Rivera: HR has given us 6 weeks to fill these roles. Lisa, can you own the hiring process?

Lisa Wang: Yes, I'll coordinate with HR and have job postings up by tomorrow.

Alex Rivera: Excellent. Any blockers or concerns we haven't addressed?

Marcus Chen: Just one - the design system updates I mentioned last month. We're still inconsistent across web and mobile.

Alex Rivera: Let's schedule a separate design sync for next week. Can you own that, Marcus?

Marcus Chen: Will do. I'll send out invites after this meeting.

Alex Rivera: Great. Let's do a quick round-robin for final thoughts. Lisa?

Lisa Wang: Excited about Q2, but let's stay disciplined about our capacity.

David Park: Agreed. Tech debt first, features second.

Emma Thompson: Customer communication will be key. I'll keep everyone updated on feedback.

Marcus Chen: Looking forward to shipping beautiful, consistent experiences.

Alex Rivera: Perfect. To summarize: Q2 focus on collaboration features and mobile tech debt, hire 3 engineers, maintain customer communication. Let's reconvene in two weeks for a progress check. Thanks everyone!`
  },
  
  general: {
    type: 'general',
    participants: {
      me: 'Jordan Smith',
      them: 'Chris Anderson'
    },
    duration: 900, // 15 minutes
    transcript: `Jordan Smith: Hey Chris, thanks for hopping on a quick call. I wanted to discuss the upcoming conference presentation.

Chris Anderson: Of course! I've been thinking about our approach. What aspects did you want to cover?

Jordan Smith: Well, we have a 45-minute slot, and I think we should focus on our recent project success with the automated testing framework. The 70% reduction in bug escape rate is a compelling story.

Chris Anderson: Absolutely. I've already started putting together some slides showing the before and after metrics. Should we include the implementation challenges we faced?

Jordan Smith: Yes, definitely. The audience will appreciate the honesty about obstacles. Remember when we had that integration issue with the CI/CD pipeline that took 3 weeks to resolve?

Chris Anderson: How could I forget! That was a learning experience. I think sharing how we solved it using the custom webhook solution would be valuable.

Jordan Smith: Agreed. What about the demo portion? Live demo or recorded?

Chris Anderson: I'm leaning toward recorded. The conference wifi is always sketchy, and we can't risk a failed demo. I can prepare a 10-minute recorded walkthrough showing the key features.

Jordan Smith: Smart thinking. Let's allocate our time like this: 10 minutes for context and problem statement, 15 minutes for our solution approach, 10 minutes for the demo, 10 minutes for results and metrics, and 5 minutes for Q&A. Sound good?

Chris Anderson: Perfect breakdown. I'll handle the technical implementation slides and demo. Can you cover the business impact and metrics?

Jordan Smith: Absolutely. I'll also create an executive summary slide for the beginning and end. When should we do a dry run?

Chris Anderson: How about next Friday at 2 PM? That gives us a week to prepare and another week to refine based on feedback.

Jordan Smith: Scheduled. Let's invite Sarah from marketing too - she always has good feedback on our messaging.

Chris Anderson: Great idea. Oh, one more thing - should we prepare backup slides for potential deep-dive questions?

Jordan Smith: Yes! Let's prepare 5-10 backup slides covering architecture details, performance benchmarks, and future roadmap. Better to be over-prepared.

Chris Anderson: Agreed. I'll start working on those this afternoon. Anything else we should cover?

Jordan Smith: I think we're good. Let's touch base on Wednesday to check progress. Thanks for being so proactive on this, Chris!

Chris Anderson: Happy to help! This is going to be a great presentation. Talk to you Wednesday!`
  }
};

export function generateMockTranscript(
  type: MockTranscript['type'], 
  participantMe?: string, 
  participantThem?: string
): MockTranscript {
  const template = mockTranscripts[type] || mockTranscripts.general;
  
  if (participantMe || participantThem) {
    const customTranscript = { ...template };
    if (participantMe) {
      customTranscript.participants.me = participantMe;
      customTranscript.transcript = customTranscript.transcript.replace(
        new RegExp(template.participants.me, 'g'), 
        participantMe
      );
    }
    if (participantThem) {
      customTranscript.participants.them = participantThem;
      customTranscript.transcript = customTranscript.transcript.replace(
        new RegExp(template.participants.them, 'g'), 
        participantThem
      );
    }
    return customTranscript;
  }
  
  return template;
}