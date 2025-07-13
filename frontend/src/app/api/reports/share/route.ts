import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/services/email/resend';
import { generateShareReportEmail } from '@/lib/services/email/templates/shareReport';
import { createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Share request body:', body);
    console.log('Session ID from request:', body.sessionId);
    const { 
      sessionId, 
      sharedTabs, 
      expiresIn, 
      message, 
      emailRecipients,
      shareWithParticipants,
      excludedEmails = []
    } = body;

    if (!sessionId || !sharedTabs || sharedTabs.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(token);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.error('User authentication failed:', {
        userError,
        token: token ? 'present' : 'missing'
      });
      return NextResponse.json(
        { error: 'Unauthorized: Invalid user', details: userError?.message },
        { status: 401 }
      );
    }
    
    console.log('Authenticated user:', user.id);

    // First, let's check if the session exists at all
    console.log('Looking up session with ID:', sessionId);
    console.log('Using authenticated user ID:', user.id);
    
    // First try with authenticated client
    const { data: sessionExists, error: checkError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    console.log('Session lookup result with auth client:', {
      found: !!sessionExists,
      error: checkError,
      sessionData: sessionExists
    });

    // If not found, try with service role to check if it's an RLS issue
    if (!sessionExists && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Trying with service role client to check RLS...');
      try {
        const serviceSupabase = createServerSupabaseClient();
        const { data: serviceCheck, error: serviceError } = await serviceSupabase
          .from('sessions')
          .select('id, user_id')
          .eq('id', sessionId)
          .single();
        
        console.log('Service role lookup result:', {
          found: !!serviceCheck,
          error: serviceError,
          sessionData: serviceCheck
        });
        
        if (serviceCheck) {
          console.error('Session exists but RLS is blocking access!', {
            sessionUserId: serviceCheck.user_id,
            currentUserId: user.id
          });
        }
      } catch (e) {
        console.error('Service role check failed:', e);
      }
    }

    if (!sessionExists || checkError) {
      console.error('Session does not exist:', {
        sessionId,
        error: checkError,
        errorCode: checkError?.code,
        errorMessage: checkError?.message
      });
      return NextResponse.json(
        { error: 'Session not found', details: `Session ID ${sessionId} does not exist` },
        { status: 404 }
      );
    }

    // Check if user owns the session
    if (sessionExists.user_id !== user.id) {
      console.error('User does not own session:', {
        sessionId,
        sessionUserId: sessionExists.user_id,
        currentUserId: user.id
      });
      return NextResponse.json(
        { error: 'Access denied', details: 'You do not have permission to share this session' },
        { status: 403 }
      );
    }

    // Now get full session details for email
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id, 
        user_id,
        title,
        participants,
        summaries (
          id,
          tldr,
          key_decisions,
          action_items,
          follow_up_questions,
          conversation_highlights
        )
      `)
      .eq('id', sessionId)
      .single();
    
    // Fetch calendar events separately to avoid ambiguous relationship
    let calendarAttendees = [];
    if (session) {
      const { data: calendarEvents } = await supabase
        .from('calendar_events')
        .select('attendees')
        .eq('session_id', sessionId)
        .limit(1)
        .single();
      
      if (calendarEvents?.attendees) {
        calendarAttendees = calendarEvents.attendees;
      }
    }

    if (!session || sessionError) {
      console.error('Failed to fetch full session details:', {
        sessionId,
        error: sessionError
      });
      return NextResponse.json(
        { error: 'Failed to fetch session details', details: sessionError?.message },
        { status: 500 }
      );
    }

    // Generate unique share token
    const shareToken = randomBytes(16).toString('hex');

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresIn !== 'never') {
      expiresAt = new Date();
      switch (expiresIn) {
        case '24hours':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case '7days':
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case '30days':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
      }
    }

    // Collect participant emails if requested
    let allEmailRecipients = [...(emailRecipients || [])];
    if (shareWithParticipants) {
      // Get participants from session or calendar event
      const participants = session.participants || calendarAttendees || [];
      
      // Extract unique emails, excluding the specified ones
      const participantEmails = participants
        .filter((p: any) => p.email && !excludedEmails.includes(p.email))
        .map((p: any) => p.email)
        .filter((email: string) => !allEmailRecipients.includes(email)); // Avoid duplicates
      
      allEmailRecipients = [...allEmailRecipients, ...participantEmails];
      console.log(`Adding ${participantEmails.length} participant emails to recipients`);
    }

    // Create share record
    const { data: shareRecord, error: insertError } = await supabase
      .from('shared_reports')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        share_token: shareToken,
        shared_tabs: sharedTabs,
        message: message || null,
        expires_at: expiresAt,
        share_with_participants: shareWithParticipants || false,
        excluded_participants: excludedEmails || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create share record:', insertError);
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Check if it's a missing table error
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { error: 'Share feature not yet configured. Please run database migrations.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create share link', details: insertError.message },
        { status: 500 }
      );
    }

    // Generate share URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const isProduction = origin.includes('liveprompt.ai') || process.env.NODE_ENV === 'production';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isProduction ? 'https://liveprompt.ai' : origin);
    const shareUrl = `${baseUrl}/shared/report/${shareToken}`;

    // Send emails if recipients provided
    let emailsSent = false;
    let emailSendStatus: Record<string, any> = {};
    if (allEmailRecipients && allEmailRecipients.length > 0 && process.env.RESEND_API_KEY) {
      try {
        // Get user details for sender name
        const { data: userData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        const senderName = userData?.full_name || userData?.email || 'A colleague';
        
        // Get the latest summary if available
        const latestSummary = session.summaries?.[session.summaries.length - 1];
        
        // Prepare summary data for email
        const emailSummary = {
          tldr: latestSummary?.tldr || 'No summary available yet.',
          keyPoints: latestSummary?.conversation_highlights || latestSummary?.key_decisions || [],
          actionItems: latestSummary?.action_items?.map((item: any) => ({
            description: typeof item === 'string' ? item : (item.task || item.description || item.action),
            owner: typeof item === 'object' ? item.owner : undefined
          })) || []
        };

        // Send email to each recipient
        const emailPromises = allEmailRecipients.map(async (recipientEmail: string) => {
          try {
            const { html, text } = generateShareReportEmail({
              recipientEmail,
              senderName,
              reportTitle: session.title || 'Meeting Report',
              reportUrl: shareUrl,
              personalMessage: message,
              summary: emailSummary,
              sharedSections: sharedTabs,
              expiresAt
            });

            await sendEmail({
              to: recipientEmail,
              subject: `${senderName} shared a meeting report with you: ${session.title || 'Meeting Report'}`,
              html,
              text,
              replyTo: userData?.email
            });

            emailSendStatus[recipientEmail] = { status: 'sent', sentAt: new Date().toISOString() };
          } catch (error) {
            console.error(`Failed to send email to ${recipientEmail}:`, error);
            emailSendStatus[recipientEmail] = { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        // Send all emails in parallel
        await Promise.all(emailPromises);
        emailsSent = Object.values(emailSendStatus).some((status: any) => status.status === 'sent');

        // Update share record with email send status
        if (Object.keys(emailSendStatus).length > 0) {
          await supabase
            .from('shared_reports')
            .update({ email_send_status: emailSendStatus })
            .eq('id', shareRecord.id);
        }

        // Log email notifications
        const emailLogs = allEmailRecipients.map((email: string) => ({
          session_id: sessionId,
          user_id: user.id,
          email_type: 'share_report',
          recipient_email: email,
          status: emailSendStatus[email]?.status || 'sent',
          sent_at: emailSendStatus[email]?.sentAt || new Date().toISOString()
        }));

        await supabase
          .from('email_notifications')
          .insert(emailLogs);

      } catch (emailError) {
        console.error('Failed to send share emails:', emailError);
        // Don't fail the whole request if email sending fails
      }
    }

    return NextResponse.json({
      shareUrl,
      shareToken,
      expiresAt,
      sharedTabs,
      emailsSent
    });

  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}