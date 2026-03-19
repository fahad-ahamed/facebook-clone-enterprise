import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get marketplace listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const condition = searchParams.get('condition');

    let where: Record<string, unknown> = {
      status: 'available',
      deletedAt: null
    };

    if (category) where.category = category;
    if (condition) where.condition = condition;
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ];
    }
    if (location) where.location = { contains: location };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    const listings = await db.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    return NextResponse.json({ listings });

  } catch (error) {
    console.error('Get marketplace listings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create listing
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, description, price, currency, negotiable,
      category, subcategory, condition, brand,
      images, video, location, city, state, country
    } = body;

    if (!title || !price || !category || !location) {
      return NextResponse.json({ error: 'Title, price, category and location are required' }, { status: 400 });
    }

    const listing = await db.marketplaceListing.create({
      data: {
        title,
        description: description || null,
        price: parseFloat(price),
        currency: currency || 'USD',
        negotiable: negotiable || false,
        category,
        subcategory: subcategory || null,
        condition: condition || 'used',
        brand: brand || null,
        images: JSON.stringify(images || []),
        video: video || null,
        location,
        city: city || null,
        state: state || null,
        country: country || null,
        sellerId: authUser.userId
      }
    });

    return NextResponse.json({ listing }, { status: 201 });

  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
