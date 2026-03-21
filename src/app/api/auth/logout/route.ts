import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get the current user to update their online status
    const authUser = await getAuthUser(request);
    
    if (authUser) {
      // Update user offline status
      await db.user.update({
        where: { id: authUser.userId },
        data: { 
          isOnline: false, 
          lastActive: new Date() 
        }
      });
    }
    
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
