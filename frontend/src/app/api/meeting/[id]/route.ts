import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;

    // Note: We don't need to filter by user_id explicitly because RLS will handle it
    // The RLS policy checks that organization_id matches user's current_organization_id
    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        meeting_metadata (*),
        session_context (text_context, context_metadata),
        users!sessions_user_id_fkey (
          id,
          email,
          full_name,
          personal_context
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database query error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sessionId: id,
        userId: user.id
      });
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Handle Supabase nested relationship which may return an object or array depending on RLS
    let contextValue: string | null = null;
    if (Array.isArray(session.session_context)) {
      contextValue = session.session_context[0]?.text_context || null;
    } else if (session.session_context && typeof session.session_context === 'object') {
      // When unique relationship returns an object
      // @ts-ignore
      contextValue = session.session_context.text_context || null;
    }

    console.log('📖 Meeting fetch - Context data:', {
      sessionId: id,
      hasSessionContext: !!session.session_context,
      contextLength: contextValue?.length || 0,
      contextPreview: contextValue ? contextValue.substring(0, 100) + '...' : 'null',
      sessionOwner: session.users?.email || 'Unknown',
      hasPersonalContext: !!session.users?.personal_context
    });

    return NextResponse.json({ 
      meeting: {
        ...session,
        context: contextValue,
        sessionOwner: session.users ? {
          id: session.users.id,
          email: session.users.email,
          fullName: session.users.full_name,
          personalContext: session.users.personal_context
        } : null
      }
    });
  } catch (error) {
    console.error('Get meeting error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;
    const updates = await req.json();
    
    console.log('📝 Meeting update request:', { id, updates });

    // Separate context updates from session updates
    const { context, ...sessionUpdates } = updates;
    
    // Map frontend fields to database columns
    const dbUpdates: Record<string, unknown> = {};
    
    if (sessionUpdates.title !== undefined) dbUpdates.title = sessionUpdates.title;
    if (sessionUpdates.conversation_type !== undefined) dbUpdates.conversation_type = sessionUpdates.conversation_type;
    if (sessionUpdates.conversation_type_custom !== undefined) dbUpdates.conversation_type = sessionUpdates.conversation_type_custom;
    if (sessionUpdates.meeting_url !== undefined) dbUpdates.meeting_url = sessionUpdates.meeting_url;
    
    // Add updated timestamp
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updated_at = new Date().toISOString();
    }

    let updatedSession = null;

    // Update sessions table if there are session-level changes
    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await supabase
        .from('sessions')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error updating session:', error);
        return NextResponse.json(
          { error: 'Failed to update meeting', details: error.message },
          { status: 500 }
        );
      }

      updatedSession = data;
    } else {
      // Get current session data if no session updates
      const { data, error } = await supabase
        .from('sessions')
        .select()
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Database error fetching session:', error);
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }

      updatedSession = data;
    }

    // Handle context update separately
    if (context !== undefined) {
      console.log('📝 Updating meeting context:', {
        session_id: id,
        context_length: context?.length || 0,
        context_preview: context ? (context.substring(0, 100) + (context.length > 100 ? '...' : '')) : 'null'
      });

      // Get user's organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgMember) {
        return NextResponse.json(
          { error: 'User must be part of an organization' },
          { status: 400 }
        );
      }

      // Check if session_context exists
      const { data: existingContext } = await supabase
        .from('session_context')
        .select('id')
        .eq('session_id', id)
        .single();

      if (existingContext) {
        console.log('🔄 Updating existing session context');
        // Update existing context
        const { error: contextError } = await supabase
          .from('session_context')
          .update({
            text_context: context,
            updated_at: new Date().toISOString(),
            context_metadata: {
              updated_from: 'meeting_settings',
              updated_at: new Date().toISOString()
            }
          })
          .eq('session_id', id);

        if (contextError) {
          console.error('❌ Error updating session context:', contextError);
          return NextResponse.json(
            { error: 'Failed to update context', details: contextError.message },
            { status: 500 }
          );
        } else {
          console.log('✅ Session context updated successfully');
        }
      } else {
        console.log('➕ Creating new session context');
        // Create new context entry
        const { error: contextError } = await supabase
          .from('session_context')
          .insert({
            session_id: id,
            user_id: user.id,
            organization_id: orgMember.organization_id,
            text_context: context,
            context_metadata: {
              created_from: 'meeting_settings',
              created_at: new Date().toISOString()
            }
          });

        if (contextError) {
          console.error('❌ Error creating session context:', contextError);
          return NextResponse.json(
            { error: 'Failed to create context', details: contextError.message },
            { status: 500 }
          );
        } else {
          console.log('✅ Session context created successfully');
        }
      }
    }

    console.log('✅ Meeting updated successfully');
    
    // Always fetch the current context to ensure we return the latest value
    const { data: currentContextData } = await supabase
      .from('session_context')
      .select('text_context')
      .eq('session_id', id)
      .single();
    
    const finalContext = currentContextData?.text_context || null;
    
    return NextResponse.json({ 
      meeting: {
        ...updatedSession,
        context: finalContext
      }
    });
  } catch (error) {
    console.error('❌ Update meeting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;

    // TODO: Stop bot if active

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}