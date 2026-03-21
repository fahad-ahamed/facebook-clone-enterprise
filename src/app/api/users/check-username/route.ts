import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Check username availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get current user if authenticated
    const authUser = await getAuthUser(request);
    const currentUserId = authUser?.userId;

    // Check if username exists (case-insensitive)
    const existingUser = await db.user.findFirst({
      where: {
        username: username.toLowerCase(),
        NOT: currentUserId ? { id: currentUserId } : undefined
      },
      select: { id: true }
    });

    // Username is available if no user found
    return NextResponse.json({ 
      available: !existingUser,
      username: username.toLowerCase()
    });

  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
