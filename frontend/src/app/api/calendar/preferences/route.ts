import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CalendarPreferences } from '@/types/calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's calendar preferences
    const { data: preferences, error } = await supabase
      .from('calendar_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching calendar preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar preferences' },
        { status: 500 }
      );
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences: Partial<CalendarPreferences> = {
        user_id: user.id,
        auto_join_enabled: false,
        join_buffer_minutes: 2,
        auto_record_enabled: false,
        notify_before_join: true,
        notification_minutes: 5,
        excluded_keywords: [],
        included_domains: []
      };
      return NextResponse.json({ preferences: defaultPreferences });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in calendar preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate the updates
    const allowedFields = [
      'auto_join_enabled',
      'join_buffer_minutes',
      'auto_record_enabled',
      'notify_before_join',
      'notification_minutes',
      'excluded_keywords',
      'included_domains'
    ];

    const validUpdates: Partial<CalendarPreferences> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        (validUpdates as Record<string, unknown>)[field] = updates[field];
      }
    }

    // Validate numeric fields
    if ('join_buffer_minutes' in validUpdates && 
        validUpdates.join_buffer_minutes !== undefined &&
        (validUpdates.join_buffer_minutes < 0 || validUpdates.join_buffer_minutes > 30)) {
      return NextResponse.json(
        { error: 'Join buffer must be between 0 and 30 minutes' },
        { status: 400 }
      );
    }

    if ('notification_minutes' in validUpdates && 
        validUpdates.notification_minutes !== undefined &&
        (validUpdates.notification_minutes < 1 || validUpdates.notification_minutes > 60)) {
      return NextResponse.json(
        { error: 'Notification time must be between 1 and 60 minutes' },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('calendar_preferences')
      .upsert({
        user_id: user.id,
        ...validUpdates
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error updating calendar preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}