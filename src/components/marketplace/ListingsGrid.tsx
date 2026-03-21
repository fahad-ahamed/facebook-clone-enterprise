'use client';

// Marketplace listings grid component
// Updated: Mar 2024

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MapPin,
  Heart,
  Share2,
  MessageCircle,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import { formatTimeAgo } from '@/utils/dateUtils';

// Local helper for price formatting
const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

// Marketplace listing type
export interface Listing {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  currency: string;
  negotiable: boolean;
  category: string;
  subcategory?: string | null;
  condition: 'new' | 'like_new' | 'used' | 'fair';
  images: string; // JSON string array
  location: string;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  viewCount: number;
  saveCount: number;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
}

// Categories for marketplace
export const MARKETPLACE_CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: '🛍️' },
  { value: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'furniture', label: 'Furniture', icon: '🛋️' },
  { value: 'clothing', label: 'Clothing', icon: '👕' },
  { value: 'home', label: 'Home & Garden', icon: '🏠' },
  { value: 'sports', label: 'Sports & Outdoors', icon: '⚽' },
  { value: 'toys', label: 'Toys & Games', icon: '🎮' },
  { value: 'books', label: 'Books & Media', icon: '📚' },
  { value: 'appliances', label: 'Appliances', icon: '🔧' },
  { value: 'property', label: 'Property Rentals', icon: '🏢' },
  { value: 'free', label: 'Free Stuff', icon: '🎁' },
];

interface ListingsGridProps {
  listings: Listing[];
  onListingClick: (listing: Listing) => void;
  onSave?: (listingId: string) => void;
  onShare?: (listingId: string) => void;
  onMessage?: (listingId: string) => void;
}

export function ListingsGrid({
  listings,
  onListingClick,
  onSave,
  onShare,
  onMessage,
}: ListingsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [savedListings, setSavedListings] = useState<Set<string>>(new Set());

  // Parse images from JSON string
  const getListingImages = (images: string): string[] => {
    try {
      return JSON.parse(images) || [];
    } catch {
      return [];
    }
  };

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        listing =>
          listing.title.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query) ||
          listing.location.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(listing => listing.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [listings, searchQuery, selectedCategory, sortBy]);

  const handleSave = (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedListings(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
    onSave?.(listingId);
  };

  const handleShare = (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(listingId);
  };

  const handleQuickMessage = (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage?.(listingId);
  };

  const getConditionBadge = (condition: string) => {
    const styles: Record<string, string> = {
      new: 'bg-green-100 text-green-700',
      like_new: 'bg-blue-100 text-blue-700',
      used: 'bg-yellow-100 text-yellow-700',
      fair: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
      new: 'New',
      like_new: 'Like New',
      used: 'Used',
      fair: 'Fair',
    };
    return (
      <Badge className={cn('text-xs font-medium', styles[condition] || styles.used)}>
        {labels[condition] || condition}
      </Badge>
    );
  };

  return (
    <div className="w-full">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-10 bg-white border-b py-3 px-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search marketplace..."
            className="pl-10 pr-4 h-11 bg-gray-100 border-0 focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MARKETPLACE_CATEGORIES.slice(0, 8).map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === cat.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
          {MARKETPLACE_CATEGORIES.length > 8 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
            >
              <Filter className="w-4 h-4" />
              More
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')}
              />
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-2">
                {MARKETPLACE_CATEGORIES.slice(8).map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      selectedCategory === cat.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Options */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {filteredListings.length} listings
          </span>
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm bg-gray-100 border-0 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Grid/List */}
      <div className="p-4">
        {filteredListings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-gray-500"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-medium">No listings found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </motion.div>
        ) : (
          <div
            className={cn(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid-cols-1'
            )}
          >
            <AnimatePresence mode="popLayout">
              {filteredListings.map((listing, index) => {
                const images = getListingImages(listing.images);
                const isSaved = savedListings.has(listing.id);

                return (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onListingClick(listing)}
                    className={cn(
                      'cursor-pointer group',
                      viewMode === 'list' && 'flex gap-4'
                    )}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-0 shadow-sm">
                      {/* Image */}
                      <div
                        className={cn(
                          'relative bg-gray-100',
                          viewMode === 'grid' ? 'aspect-square' : 'w-48 h-32 shrink-0'
                        )}
                      >
                        {images[0] ? (
                          <img
                            src={images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}

                        {/* Quick Actions Overlay */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => handleSave(listing.id, e)}
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors',
                              isSaved
                                ? 'bg-red-500 text-white'
                                : 'bg-white/80 hover:bg-white text-gray-700'
                            )}
                          >
                            <Heart
                              className={cn('w-4 h-4', isSaved && 'fill-current')}
                            />
                          </button>
                          <button
                            onClick={e => handleShare(listing.id, e)}
                            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-700 backdrop-blur-sm"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Condition Badge */}
                        <div className="absolute top-2 left-2">
                          {getConditionBadge(listing.condition)}
                        </div>

                        {/* Price Badge */}
                        {listing.negotiable && (
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-black/60 text-white text-xs">
                              Negotiable
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <CardContent className="p-3">
                        {/* Price */}
                        <p className="font-bold text-lg text-gray-900">
                          {formatPrice(listing.price, listing.currency)}
                        </p>

                        {/* Title */}
                        <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                          {listing.title}
                        </p>

                        {/* Location & Time */}
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {listing.city || listing.location}
                          </span>
                          <span>·</span>
                          <span>{formatTimeAgo(listing.createdAt)}</span>
                        </div>

                        {/* Seller Info (list view) */}
                        {viewMode === 'list' && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={listing.seller.avatar || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(
                                    listing.seller.firstName,
                                    listing.seller.lastName
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">
                                {listing.seller.firstName} {listing.seller.lastName}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={e => handleQuickMessage(listing.id, e)}
                              className="h-8"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Message
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
