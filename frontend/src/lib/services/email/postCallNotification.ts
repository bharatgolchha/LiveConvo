import { sendEmail } from './resend';
import { generateSessionSummaryEmail } from './templates/sessionSummary';
import { EnhancedSummary } from '@/types/api';
import { supabase } from '@/lib/supabase';

export interface PostCallNotificationData {
  sessionId: string;
  userId: string;
  userEmail: string;
  sessionTitle: string;
  sessionDate: Date;
  duration: number; // in seconds
  participants: {
    me: string;
    them: string;
  };
  summary: EnhancedSummary;
  transcript?: string;
  conversationType?: string;
  appUrl: string;
}

export async function sendPostCallNotification(data: PostCallNotificationData) {
  try {
    console.log('📧 Preparing post-call notification email for session:', data.sessionId);
    
    // Format duration
    const hours = Math.floor(data.duration / 3600);
    const minutes = Math.floor((data.duration % 3600) / 60);
    const seconds = data.duration % 60;
    
    let durationString = '';
    if (hours > 0) {
      durationString = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      durationString = `${minutes}m ${seconds}s`;
    } else {
      durationString = `${seconds}s`;
    }
    
    // Format date
    const dateString = new Date(data.sessionDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Generate report URL
    const reportUrl = `${data.appUrl}/report/${data.sessionId}`;
    
    // Generate email content
    const { html, text } = generateSessionSummaryEmail({
      sessionId: data.sessionId,
      sessionTitle: data.sessionTitle,
      sessionDate: dateString,
      duration: durationString,
      participants: data.participants,
      summary: data.summary,
      reportUrl,
      conversationType: data.conversationType
    });
    
    // Send email
    const result = await sendEmail({
      to: data.userEmail,
      subject: `Meeting Summary: ${data.sessionTitle}`,
      html,
      text,
      replyTo: 'support@marketing.liveprompt.ai'
    });
    
    // Log email sent in database
    await logEmailNotification({
      sessionId: data.sessionId,
      userId: data.userId,
      emailType: 'post_call_summary',
      recipientEmail: data.userEmail,
      status: 'sent',
      sentAt: new Date().toISOString()
    });
    
    console.log('✅ Post-call notification sent successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send post-call notification:', error);
    
    // Log failed attempt
    await logEmailNotification({
      sessionId: data.sessionId,
      userId: data.userId,
      emailType: 'post_call_summary',
      recipientEmail: data.userEmail,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      sentAt: new Date().toISOString()
    });
    
    throw error;
  }
}

async function logEmailNotification(data: {
  sessionId: string;
  userId: string;
  emailType: string;
  recipientEmail: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: string;
}) {
  try {
    const { error } = await supabase
      .from('email_notifications')
      .insert({
        session_id: data.sessionId,
        user_id: data.userId,
        email_type: data.emailType,
        recipient_email: data.recipientEmail,
        status: data.status,
        error_message: data.error,
        sent_at: data.sentAt
      });
      
    if (error) {
      console.error('Failed to log email notification:', error);
    }
  } catch (error) {
    console.error('Error logging email notification:', error);
  }
}