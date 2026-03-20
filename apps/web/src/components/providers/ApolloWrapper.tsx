'use client';

import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  split,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { type ReactNode, useMemo } from 'react';

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      fetch: (uri, options) => {
        return fetch(uri as string, {
          ...options,
          credentials: 'include',
        });
      },
    });

    const authLink = setContext((_, { headers }) => {
      // Get token from localStorage or cookies
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('accessToken');
      }

      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        },
      };
    });

    const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path, extensions }) => {
          console.error(
            `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
          );

          // Handle authentication errors
          if (extensions?.code === 'UNAUTHENTICATED') {
            // Clear token and redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
        });
      }

      if (networkError) {
        console.error(`[Network Error]: ${networkError.message}`);
        // Could implement retry logic here
      }
    });

    const wsLink =
      typeof window !== 'undefined'
        ? new GraphQLWsLink(
            createClient({
              url: process.env.NEXT_PUBLIC_WS_ENDPOINT || 'ws://localhost:4000/graphql',
              connectionParams: () => {
                const token = localStorage.getItem('accessToken');
                return {
                  authorization: token ? `Bearer ${token}` : '',
                };
              },
              on: {
                connected: () => console.log('[WebSocket] Connected'),
                closed: () => console.log('[WebSocket] Closed'),
                error: (error) => console.error('[WebSocket Error]:', error),
              },
            })
          )
        : null;

    const splitLink =
      typeof window !== 'undefined' && wsLink
        ? split(
            ({ query }) => {
              const definition = getMainDefinition(query);
              return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
              );
            },
            wsLink,
            httpLink
          )
        : httpLink;

    return new ApolloClient({
      link: from([errorLink, authLink, splitLink]),
      cache: new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              feed: {
                keyArgs: ['feedType'],
                merge(existing, incoming, { args }) {
                  if (!existing || !args) return incoming;
                  
                  const offset = args.offset || 0;
                  const merged = existing.posts ? existing.posts.slice(0) : [];
                  
                  for (let i = 0; i < incoming.posts.length; ++i) {
                    merged[offset + i] = incoming.posts[i];
                  }
                  
                  return {
                    ...incoming,
                    posts: merged,
                  };
                },
              },
              userPosts: {
                keyArgs: ['userId'],
                merge(existing, incoming, { args }) {
                  if (!existing || !args) return incoming;
                  
                  const offset = args.offset || 0;
                  const merged = existing.posts ? existing.posts.slice(0) : [];
                  
                  for (let i = 0; i < incoming.posts.length; ++i) {
                    merged[offset + i] = incoming.posts[i];
                  }
                  
                  return {
                    ...incoming,
                    posts: merged,
                  };
                },
              },
            },
          },
          Post: {
            fields: {
              reactions: {
                merge(existing, incoming) {
                  return incoming;
                },
              },
              comments: {
                keyArgs: false,
                merge(existing, incoming) {
                  if (!existing) return incoming;
                  return {
                    ...incoming,
                    edges: [...existing.edges, ...incoming.edges],
                  };
                },
              },
            },
          },
          User: {
            fields: {
              friendCount: {
                merge: false,
              },
              followerCount: {
                merge: false,
              },
              postCount: {
                merge: false,
              },
            },
          },
        },
      }),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network',
          errorPolicy: 'all',
        },
        query: {
          fetchPolicy: 'cache-first',
          errorPolicy: 'all',
        },
        mutate: {
          errorPolicy: 'all',
        },
      },
      connectToDevTools: process.env.NODE_ENV === 'development',
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
