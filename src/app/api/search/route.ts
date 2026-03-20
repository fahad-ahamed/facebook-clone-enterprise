import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Common countries list for autocomplete
export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius',
  'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea',
  'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago', 'Tunisia',
  'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Global search - optimized with categorized results
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({ results: {}, query: '' });
    }

    const results: Record<string, unknown[]> = {};
    const searchLower = query.toLowerCase();

    // Check if this is a username search (starts with @)
    const isUsernameSearch = query.startsWith('@');
    const usernameQuery = isUsernameSearch ? query.slice(1) : null;

    // Search users - comprehensive search across username, firstName, lastName, email
    if (type === 'all' || type === 'users') {
      if (isUsernameSearch && usernameQuery) {
        // Specific username search
        const user = await db.user.findFirst({
          where: {
            username: { equals: usernameQuery.toLowerCase() },
            deletedAt: null,
            searchVisibility: true
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            currentCity: true,
            country: true,
            isVerified: true,
            badgeType: true,
            isOnline: true
          }
        });
        results.users = user ? [user] : [];
      } else {
        // General user search
        results.users = await db.user.findMany({
          where: {
            OR: [
              { firstName: { contains: searchLower } },
              { lastName: { contains: searchLower } },
              { username: { contains: searchLower } },
              { email: { contains: searchLower } }
            ],
            deletedAt: null,
            searchVisibility: true
          },
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            currentCity: true,
            country: true,
            isVerified: true,
            badgeType: true,
            isOnline: true
          }
        });
      }
    }

    // Search posts - comprehensive content search
    if (type === 'all' || type === 'posts') {
      // Build visibility filter for authenticated users
      let visibilityFilter: Record<string, unknown> = {
        deletedAt: null,
        content: { contains: searchLower }
      };

      if (authUser) {
        // Get user's friends for visibility filtering
        const friendships = await db.friendship.findMany({
          where: {
            OR: [
              { user1Id: authUser.userId },
              { user2Id: authUser.userId }
            ]
          }
        });
        const friendIds = friendships.map(f => 
          f.user1Id === authUser.userId ? f.user2Id : f.user1Id
        );

        visibilityFilter = {
          deletedAt: null,
          content: { contains: searchLower },
          OR: [
            { visibility: 'public' },
            { visibility: 'friends', authorId: { in: [...friendIds, authUser.userId] } },
            { authorId: authUser.userId }
          ]
        };
      } else {
        // Only show public posts for non-authenticated users
        visibilityFilter = {
          deletedAt: null,
          content: { contains: searchLower },
          visibility: 'public'
        };
      }

      results.posts = await db.post.findMany({
        where: visibilityFilter,
        take: limit,
        select: {
          id: true,
          content: true,
          mediaUrl: true,
          mediaType: true,
          visibility: true,
          createdAt: true,
          likeCount: true,
          commentCount: true,
          author: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              avatar: true,
              username: true,
              badgeType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Search groups
    if (type === 'all' || type === 'groups') {
      results.groups = await db.group.findMany({
        where: {
          OR: [
            { name: { contains: searchLower } },
            { description: { contains: searchLower } }
          ],
          deletedAt: null,
          type: { not: 'secret' } // Don't show secret groups in search
        },
        take: limit,
        select: {
          id: true,
          name: true,
          avatar: true,
          memberCount: true,
          type: true
        }
      });
    }

    // Search pages
    if (type === 'all' || type === 'pages') {
      results.pages = await db.page.findMany({
        where: {
          OR: [
            { name: { contains: searchLower } },
            { description: { contains: searchLower } },
            { username: { contains: searchLower } }
          ],
          deletedAt: null,
          published: true
        },
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          likeCount: true,
          verified: true
        }
      });
    }

    // Search events
    if (type === 'all' || type === 'events') {
      results.events = await db.event.findMany({
        where: {
          OR: [
            { title: { contains: searchLower } },
            { description: { contains: searchLower } }
          ],
          deletedAt: null,
          visibility: 'public'
        },
        take: limit,
        select: {
          id: true,
          title: true,
          coverPhoto: true,
          startDate: true,
          location: true
        }
      });
    }

    // Search marketplace
    if (type === 'all' || type === 'marketplace') {
      results.marketplace = await db.marketplaceListing.findMany({
        where: {
          OR: [
            { title: { contains: searchLower } },
            { description: { contains: searchLower } }
          ],
          status: 'available',
          deletedAt: null
        },
        take: limit,
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          images: true,
          location: true
        }
      });
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({ 
      results, 
      query,
      totalResults,
      isUsernameSearch
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
