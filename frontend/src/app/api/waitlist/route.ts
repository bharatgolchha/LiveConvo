import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, useCase } = body;

    // Validate required fields
    if (!name || !email || !company || !useCase) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('beta_waitlist')
      .select('id')
      .eq('email', email)
      .single();

    // Handle table not existing
    if (checkError && checkError.message?.includes('relation "beta_waitlist" does not exist')) {
      return NextResponse.json(
        { 
          error: 'Beta waitlist not yet configured',
          details: 'Please run the database migration first. Execute beta_waitlist_migration.sql in your Supabase dashboard.'
        },
        { status: 503 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered for beta access' },
        { status: 409 }
      );
    }

    // Insert into waitlist
    const { data, error } = await supabase
      .from('beta_waitlist')
      .insert([{
        name,
        email,
        company,
        use_case: useCase,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting waitlist entry:', error);
      
      // Provide specific error messages
      if (error.message?.includes('relation "beta_waitlist" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Beta waitlist not yet configured',
            details: 'Please run the database migration first. Execute beta_waitlist_migration.sql in your Supabase dashboard.'
          },
          { status: 503 }
        );
      }
      
      if (error.message?.includes('violates row-level security policy')) {
        return NextResponse.json(
          { 
            error: 'Database access restricted',
            details: 'The beta_waitlist table needs proper RLS policies for public access. Please check the migration file.'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    // TODO: Send confirmation email to user
    // TODO: Send notification email to team

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: {
        id: data.id,
        name: data.name,
        email: data.email
      }
    });

  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 