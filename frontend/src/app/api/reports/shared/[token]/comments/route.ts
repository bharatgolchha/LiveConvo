import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGuestIdentity, setGuestIdentity } from '@/lib/guest-identity';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify share token is valid
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('session_id, expires_at')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Get comments for the session
    const { data: comments, error: commentsError } = await supabase
      .from('report_comments')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('session_id', shareRecord.session_id)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      
      // If schema cache error, try simpler query
      if (commentsError.message?.includes('schema cache')) {
        const { data: simpleComments, error: simpleError } = await supabase
          .from('report_comments')
          .select('*')
          .eq('session_id', shareRecord.session_id)
          .order('created_at', { ascending: false });
          
        if (simpleError) {
          return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
          );
        }
        
        // Manually fetch user info for non-guest comments
        const userIds = simpleComments
          ?.filter(c => c.user_id && !c.is_guest)
          .map(c => c.user_id) || [];
        
        interface UserData {
          id: string;
          full_name?: string;
          email?: string;
        }
        let users: UserData[] = [];
        if (userIds.length > 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('id', userIds);
          users = userData || [];
        }
        
        // Map users to comments
        const commentsWithUsers = simpleComments?.map(comment => {
          const user = users.find(u => u.id === comment.user_id);
          return {
            ...comment,
            user
          };
        });
        
        // Continue with transformed comments
        const transformedComments = (commentsWithUsers || []).map(comment => ({
          ...comment,
          author_name: comment.is_guest 
            ? comment.guest_name 
            : (comment.user?.full_name || comment.user?.email || 'Anonymous'),
          author_type: comment.is_guest ? 'guest' : 'user',
          author_email: comment.user?.email
        }));

        // Get guest identity if available
        const guestIdentity = await getGuestIdentity();

        return NextResponse.json({ 
          comments: transformedComments,
          guestIdentity 
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Transform comments to include author info
    const transformedComments = (comments || []).map(comment => ({
      ...comment,
      author_name: comment.is_guest 
        ? comment.guest_name 
        : (comment.user?.full_name || comment.user?.email || 'Anonymous'),
      author_type: comment.is_guest ? 'guest' : 'user',
      author_email: comment.user?.email
    }));

    // Get guest identity if available
    const guestIdentity = await getGuestIdentity();

    return NextResponse.json({ 
      comments: transformedComments,
      guestIdentity 
    });
  } catch (error) {
    console.error('Error in shared comments GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { content, section, sectionId, parentCommentId, guestName } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check for authenticated user first
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.split(' ')[1];
    let userId = null;
    let isAuthenticated = false;

    if (authToken) {
      try {
        const authSupabase = createAuthenticatedSupabaseClient(authToken);
        const { data: { user } } = await authSupabase.auth.getUser(authToken);
        if (user) {
          userId = user.id;
          isAuthenticated = true;
        }
      } catch (error) {
        console.log('User not authenticated, proceeding as guest');
      }
    }

    // Handle guest identity
    let guestIdentity = null;
    if (!isAuthenticated) {
      guestIdentity = await getGuestIdentity();
      
      // If no guest identity and name provided, create one
      if (!guestIdentity && guestName) {
        guestIdentity = await setGuestIdentity(guestName);
      }
      
      if (!guestIdentity) {
        return NextResponse.json(
          { error: 'Guest name is required for anonymous comments' },
          { status: 400 }
        );
      }
    }

    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify share token and get session ID
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('session_id, expires_at')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Create the comment
    const commentData: Record<string, unknown> = {
      session_id: shareRecord.session_id,
      content: content.trim(),
      section_id: sectionId || section || null,
      parent_comment_id: parentCommentId || null,
    };

    if (isAuthenticated) {
      commentData.user_id = userId;
      commentData.is_guest = false;
    } else {
      commentData.guest_id = guestIdentity!.id;
      commentData.guest_name = guestIdentity!.name;
      commentData.is_guest = true;
    }

    // Insert the comment
    const { data: comment, error: createError } = await supabase
      .from('report_comments')
      .insert([commentData])
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating comment:', createError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Fetch the comment with author info
    const { data: commentWithAuthor, error: fetchError } = await supabase
      .from('report_comments')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', comment.id)
      .single();

    if (fetchError) {
      console.error('Error fetching comment with author:', fetchError);
      // For guest comments, add the author info manually
      if (commentData.is_guest) {
        return NextResponse.json({ 
          comment: {
            ...comment,
            author_name: commentData.guest_name,
            author_type: 'guest'
          }
        });
      }
      return NextResponse.json({ comment });
    }

    // Log activity
    await supabase
      .from('report_activity')
      .insert({
        session_id: shareRecord.session_id,
        user_id: isAuthenticated ? userId : null,
        guest_id: !isAuthenticated ? guestIdentity!.id : null,
        activity_type: 'commented',
        details: { comment_id: comment.id }
      });

    // Transform comment to include author info
    const transformedComment = {
      ...commentWithAuthor,
      author_name: commentWithAuthor.is_guest 
        ? commentWithAuthor.guest_name 
        : (commentWithAuthor.user?.full_name || commentWithAuthor.user?.email || 'Anonymous'),
      author_type: commentWithAuthor.is_guest ? 'guest' : 'user',
      author_email: commentWithAuthor.user?.email
    };

    return NextResponse.json({ 
      comment: transformedComment,
      guestIdentity: !isAuthenticated ? guestIdentity : null 
    });
  } catch (error) {
    console.error('Error in shared comments POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.split(' ')[1];
    let userId = null;
    let isAuthenticated = false;

    if (authToken) {
      try {
        const authSupabase = createAuthenticatedSupabaseClient(authToken);
        const { data: { user } } = await authSupabase.auth.getUser(authToken);
        if (user) {
          userId = user.id;
          isAuthenticated = true;
        }
      } catch (error) {
        console.log('User not authenticated, checking guest identity');
      }
    }

    // Get guest identity if not authenticated
    const guestIdentity = !isAuthenticated ? await getGuestIdentity() : null;

    if (!isAuthenticated && !guestIdentity) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify share token
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('session_id, expires_at')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Get the comment to check ownership
    const { data: existingComment, error: fetchError } = await supabase
      .from('report_comments')
      .select('user_id, guest_id, session_id')
      .eq('id', commentId)
      .single();

    if (!existingComment || fetchError) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user can edit this comment
    const canEdit = isAuthenticated 
      ? existingComment.user_id === userId
      : existingComment.guest_id === guestIdentity?.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this comment' },
        { status: 403 }
      );
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('report_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    // Fetch with author info
    const { data: commentWithAuthor } = await supabase
      .from('report_comments')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', commentId)
      .single();

    // Transform comment to include author info
    const transformedComment = commentWithAuthor ? {
      ...commentWithAuthor,
      author_name: commentWithAuthor.is_guest 
        ? commentWithAuthor.guest_name 
        : (commentWithAuthor.user?.full_name || commentWithAuthor.user?.email || 'Anonymous'),
      author_type: commentWithAuthor.is_guest ? 'guest' : 'user',
      author_email: commentWithAuthor.user?.email
    } : updatedComment;

    return NextResponse.json({ 
      comment: transformedComment
    });
  } catch (error) {
    console.error('Error in shared comments PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.split(' ')[1];
    let userId = null;
    let isAuthenticated = false;

    if (authToken) {
      try {
        const authSupabase = createAuthenticatedSupabaseClient(authToken);
        const { data: { user } } = await authSupabase.auth.getUser(authToken);
        if (user) {
          userId = user.id;
          isAuthenticated = true;
        }
      } catch (error) {
        console.log('User not authenticated, checking guest identity');
      }
    }

    // Get guest identity if not authenticated
    const guestIdentity = !isAuthenticated ? await getGuestIdentity() : null;

    if (!isAuthenticated && !guestIdentity) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify share token
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('session_id')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Get the comment to check ownership
    const { data: existingComment, error: fetchError } = await supabase
      .from('report_comments')
      .select('user_id, guest_id')
      .eq('id', commentId)
      .single();

    if (!existingComment || fetchError) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this comment
    const canDelete = isAuthenticated 
      ? existingComment.user_id === userId
      : existingComment.guest_id === guestIdentity?.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('report_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in shared comments DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}