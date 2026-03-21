'use client';

import { useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Feed } from '@/components/Feed/Feed';
import { CreatePost } from '@/components/Feed/CreatePost';
import { StoriesSection } from '@/components/Feed/StoriesSection';
import { Sidebar } from '@/components/Layout/Sidebar';
import { RightSidebar } from '@/components/Layout/RightSidebar';
import { GET_FEED } from '@/graphql/queries/feedQueries';
import { useAuthStore } from '@/hooks/useAuth';
import type { FeedData, FeedVariables } from '@/types/feed';

export default function HomePage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  
  const { 
    data: feedData, 
    loading: feedLoading, 
    error: feedError,
    fetchMore,
    refetch 
  } = useQuery<FeedData, FeedVariables>(GET_FEED, {
    variables: { 
      limit: 10, 
      offset: 0 
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        !feedLoading &&
        feedData?.feed.pageInfo.hasNextPage
      ) {
        fetchMore({
          variables: {
            offset: feedData.feed.posts.length,
          },
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [feedLoading, feedData, fetchMore]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">facebook</h1>
            <p className="text-gray-600 mb-8">
              Connect with friends and the world around you on Facebook.
            </p>
            <button className="btn-facebook w-full text-lg py-3 mb-4">
              Log In
            </button>
            <button className="w-full bg-green-500 text-white px-4 py-3 rounded-md font-semibold hover:bg-green-600 transition-colors">
              Create New Account
            </button>
            <p className="mt-6 text-sm text-gray-500">
              By clicking Log In, you agree to our Terms, Privacy Policy and Cookies Policy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="flex max-w-7xl mx-auto px-4 py-4 gap-4">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <Sidebar user={user} />
        </div>
        
        {/* Main Feed */}
        <div className="flex-1 max-w-xl mx-auto lg:mx-0">
          {/* Stories */}
          <StoriesSection />
          
          {/* Create Post */}
          <CreatePost 
            user={user} 
            onPostCreated={() => refetch()} 
          />
          
          {/* Feed */}
          <Feed 
            posts={feedData?.feed.posts ?? []} 
            loading={feedLoading}
            error={feedError}
            onRefetch={() => refetch()}
          />
        </div>
        
        {/* Right Sidebar */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          <RightSidebar />
        </div>
      </div>
    </MainLayout>
  );
}
