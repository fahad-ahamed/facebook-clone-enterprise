import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get friends or friend suggestions
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'friends';
    const targetUserId = searchParams.get('userId');

    if (type === 'friends') {
      const friendships = await db.friendship.findMany({
        where: {
          OR: [
            { user1Id: targetUserId || authUser.userId },
            { user2Id: targetUserId || authUser.userId }
          ]
        },
        include: {
          user1: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          },
          user2: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          }
        }
      });

      const friends = friendships.map(f => 
        f.user1Id === (targetUserId || authUser.userId) ? f.user2 : f.user1
      );

      return NextResponse.json({ friends });
    }

    if (type === 'requests') {
      const requests = await db.friendRequest.findMany({
        where: {
          receiverId: authUser.userId,
          status: 'pending'
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ requests });
    }

    if (type === 'sent') {
      const sent = await db.friendRequest.findMany({
        where: {
          senderId: authUser.userId,
          status: 'pending'
        },
        include: {
          receiver: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ sent });
    }

    if (type === 'suggestions') {
      // Get existing friends
      const friendships = await db.friendship.findMany({
        where: {
          OR: [{ user1Id: authUser.userId }, { user2Id: authUser.userId }]
        }
      });

      const friendIds = friendships.map(f => 
        f.user1Id === authUser.userId ? f.user2Id : f.user1Id
      );

      // Get pending requests
      const pendingRequests = await db.friendRequest.findMany({
        where: {
          OR: [
            { senderId: authUser.userId },
            { receiverId: authUser.userId }
          ],
          status: 'pending'
        }
      });

      const pendingUserIds = pendingRequests.map(r => 
        r.senderId === authUser.userId ? r.receiverId : r.senderId
      );

      // Get friends of friends
      const friendsOfFriends = await db.friendship.findMany({
        where: {
          OR: [
            { user1Id: { in: friendIds } },
            { user2Id: { in: friendIds } }
          ],
          NOT: {
            OR: [
              { user1Id: authUser.userId },
              { user2Id: authUser.userId }
            ]
          }
        },
        include: {
          user1: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          },
          user2: {
            select: { id: true, firstName: true, lastName: true, avatar: true, currentCity: true }
          }
        },
        take: 20
      });

      const suggestions = friendsOfFriends
        .map(f => f.user1Id === authUser.userId ? f.user2 : f.user1)
        .filter(u => !friendIds.includes(u.id) && !pendingUserIds.includes(u.id));

      // Remove duplicates
      const uniqueSuggestions = Array.from(new Map(suggestions.map(s => [s.id, s])).values());

      return NextResponse.json({ suggestions: uniqueSuggestions.slice(0, 10) });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send friend request
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, action } = body;

    if (action === 'send') {
      // Check if already friends
      const existingFriendship = await db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: authUser.userId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: authUser.userId }
          ]
        }
      });

      if (existingFriendship) {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 });
      }

      // Check for existing request
      const existingRequest = await db.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: authUser.userId, receiverId },
            { senderId: receiverId, receiverId: authUser.userId }
          ],
          status: 'pending'
        }
      });

      if (existingRequest) {
        return NextResponse.json({ error: 'Request already exists' }, { status: 400 });
      }

      const friendRequest = await db.friendRequest.create({
        data: {
          senderId: authUser.userId,
          receiverId
        }
      });

      return NextResponse.json({ request: friendRequest }, { status: 201 });
    }

    if (action === 'accept') {
      const friendRequest = await db.friendRequest.findFirst({
        where: {
          senderId: receiverId,
          receiverId: authUser.userId,
          status: 'pending'
        }
      });

      if (!friendRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // Create friendship
      await db.friendship.create({
        data: {
          user1Id: authUser.userId,
          user2Id: receiverId
        }
      });

      // Update request status
      await db.friendRequest.update({
        where: { id: friendRequest.id },
        data: { status: 'accepted' }
      });

      return NextResponse.json({ message: 'Friend request accepted' });
    }

    if (action === 'reject') {
      await db.friendRequest.updateMany({
        where: {
          senderId: receiverId,
          receiverId: authUser.userId,
          status: 'pending'
        },
        data: { status: 'rejected' }
      });

      return NextResponse.json({ message: 'Friend request rejected' });
    }

    if (action === 'cancel') {
      await db.friendRequest.updateMany({
        where: {
          senderId: authUser.userId,
          receiverId: receiverId,
          status: 'pending'
        },
        data: { status: 'canceled' }
      });

      return NextResponse.json({ message: 'Friend request canceled' });
    }

    if (action === 'unfriend') {
      await db.friendship.deleteMany({
        where: {
          OR: [
            { user1Id: authUser.userId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: authUser.userId }
          ]
        }
      });

      return NextResponse.json({ message: 'Unfriended successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Friend action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
