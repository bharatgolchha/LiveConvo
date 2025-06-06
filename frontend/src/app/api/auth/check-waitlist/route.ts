import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if the email exists in the waitlist with approved/invited status
    const { data: waitlistEntry, error } = await supabase
      .from('beta_waitlist')
      .select('id, email, status')
      .eq('email', email.toLowerCase())
      .in('status', ['approved', 'invited'])
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking waitlist:', error)
      return NextResponse.json(
        { error: 'Failed to check waitlist status' },
        { status: 500 }
      )
    }

    const isApproved = !!waitlistEntry

    return NextResponse.json({
      isApproved,
      status: waitlistEntry?.status || null
    })

  } catch (error) {
    console.error('Error in check-waitlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 