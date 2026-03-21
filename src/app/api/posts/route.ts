import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET posts for feed
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const authorId = searchParams.get('authorId');
    const groupId = searchParams.get('groupId');
    const pageId = searchParams.get('pageId');

    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {
      deletedAt: null
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (groupId) {
      where.groupId = groupId;
    }

    if (pageId) {
      where.pageId = pageId;
    }

    const posts = await db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            username: true
          }
        },
        reactions: {
          select: {
            id: true,
            type: true,
            userId: true
          }
        },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          where: { deletedAt: null }
        },
        _count: {
          select: {
            comments: { where: { deletedAt: null } },
            reactions: true,
            shares: true
          }
        },
        group: {
          select: { id: true, name: true, avatar: true }
        },
        page: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Get user's reactions to these posts
    let userReactions: Record<string, string> = {};
    if (authUser) {
      const reactions = await db.reaction.findMany({
        where: {
          userId: authUser.userId,
          postId: { in: posts.map(p => p.id) }
        },
        select: { postId: true, type: true }
      });
      reactions.forEach(r => {
        if (r.postId) userReactions[r.postId] = r.type;
      });
    }

    const postsWithUserReaction = posts.map(post => ({
      ...post,
      userReaction: userReactions[post.id] || null
    }));

    return NextResponse.json({ posts: postsWithUserReaction });

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CREATE new post
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      content, 
      mediaUrl, 
      mediaType, 
      mediaUrls,
      postType,
      visibility,
      feeling,
      activity,
      activityTarget,
      location,
      taggedUsers,
      backgroundColor,
      textColor,
      groupId,
      pageId,
      linkUrl,
      linkTitle,
      linkDescription,
      linkImage
    } = body;

    if (!content && !mediaUrl && !mediaUrls && !linkUrl) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      );
    }

    const post = await db.post.create({
      data: {
        authorId: authUser.userId,
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        postType: postType || 'status',
        visibility: visibility || 'friends',
        feeling: feeling || null,
        activity: activity || null,
        activityTarget: activityTarget || null,
        location: location || null,
        taggedUsers: taggedUsers ? JSON.stringify(taggedUsers) : null,
        backgroundColor: backgroundColor || null,
        textColor: textColor || null,
        groupId: groupId || null,
        pageId: pageId || null,
        linkUrl: linkUrl || null,
        linkTitle: linkTitle || null,
        linkDescription: linkDescription || null,
        linkImage: linkImage || null
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            username: true
          }
        },
        group: {
          select: { id: true, name: true }
        },
        page: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ post }, { status: 201 });

  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
