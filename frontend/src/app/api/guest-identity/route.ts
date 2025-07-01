import { NextRequest, NextResponse } from 'next/server';
import { getGuestIdentity, setGuestIdentity, clearGuestIdentity } from '@/lib/guest-identity';

export async function GET(request: NextRequest) {
  try {
    const identity = await getGuestIdentity();
    return NextResponse.json({ identity });
  } catch (error) {
    console.error('Error getting guest identity:', error);
    return NextResponse.json(
      { error: 'Failed to get guest identity' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const identity = await setGuestIdentity(name.trim());
    return NextResponse.json({ identity });
  } catch (error) {
    console.error('Error setting guest identity:', error);
    return NextResponse.json(
      { error: 'Failed to set guest identity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await clearGuestIdentity();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing guest identity:', error);
    return NextResponse.json(
      { error: 'Failed to clear guest identity' },
      { status: 500 }
    );
  }
}