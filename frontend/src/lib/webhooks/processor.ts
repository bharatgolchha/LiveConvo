import { broadcastWebhookEvent } from '@/lib/webhooks/event-broadcaster';

export interface WebhookEvent {
  type: string;
  botId: string;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  status?: string;
  data: any;
  timestamp: string;
}

export class WebhookEventProcessor {
  // Process bot status events
  static async processBotStatusEvent(event: WebhookEvent) {
    const { type, botId, sessionId, data } = event;
    
    // Determine the event category
    let category = 'info';
    let title = '';
    let message = '';
    
    switch (type) {
      case 'bot.joining_call':
        category = 'info';
        title = 'Bot Joining Meeting';
        message = 'LivePrompt Assistant is joining the meeting...';
        break;
        
      case 'bot.in_waiting_room':
        category = 'warning';
        title = 'Bot in Waiting Room';
        message = 'The bot is waiting to be admitted to the meeting.';
        break;
        
      case 'bot.in_call_recording':
        category = 'success';
        title = 'Recording Started';
        message = 'LivePrompt Assistant is now recording the meeting.';
        break;
        
      case 'bot.recording_permission_denied':
        category = 'error';
        title = 'Recording Permission Denied';
        message = `Recording permission was denied: ${data.sub_code || 'Unknown reason'}`;
        break;
        
      case 'bot.call_ended':
        category = 'info';
        title = 'Meeting Ended';
        message = 'The meeting has ended.';
        break;
        
      case 'bot.done':
        category = 'success';
        title = 'Recording Complete';
        message = 'Meeting recording has been completed successfully.';
        break;
        
      case 'bot.fatal':
        category = 'error';
        title = 'Bot Error';
        message = `Bot encountered an error: ${data.sub_code || 'Unknown error'}`;
        break;
    }
    
    // Broadcast the event to connected clients
    if (sessionId) {
      broadcastWebhookEvent({
        type: 'bot_status_update',
        sessionId,
        userId: event.userId,
        data: {
          botId,
          status: type,
          category,
          title,
          message,
          details: data,
          metadata: event.data.bot?.metadata
        }
      });
    }
  }
  
  // Process transcript events  
  static async processTranscriptEvent(event: {
    sessionId: string;
    userId?: string;
    transcriptData: any;
  }) {
    broadcastWebhookEvent({
      type: 'transcript_update',
      sessionId: event.sessionId,
      userId: event.userId,
      data: {
        transcript: event.transcriptData,
        wordCount: event.transcriptData.words?.length || 0
      }
    });
  }
  
  // Process participant events
  static async processParticipantEvent(event: {
    sessionId: string;
    userId?: string;
    action: string;
    participant: any;
  }) {
    let message = '';
    
    switch (event.action) {
      case 'join':
        message = `${event.participant.name || 'Someone'} joined the meeting`;
        break;
      case 'leave':
        message = `${event.participant.name || 'Someone'} left the meeting`;
        break;
    }
    
    if (message) {
      broadcastWebhookEvent({
        type: 'participant_event',
        sessionId: event.sessionId,
        userId: event.userId,
        data: {
          action: event.action,
          participant: event.participant,
          message
        }
      });
    }
  }
  
  // Process usage updates
  static async processUsageUpdate(event: {
    sessionId: string;
    userId?: string;
    organizationId?: string;
    minutes: number;
    cost: number;
  }) {
    broadcastWebhookEvent({
      type: 'usage_update',
      sessionId: event.sessionId,
      userId: event.userId,
      data: {
        minutes: event.minutes,
        cost: event.cost,
        organizationId: event.organizationId
      }
    });
  }
}