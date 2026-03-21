import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ApolloWrapper } from '@/components/providers/ApolloWrapper';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Facebook - Connect with Friends',
    template: '%s | Facebook',
  },
  description: 'Connect with friends, family and other people you know. Share photos and videos, send messages and get updates.',
  keywords: ['social network', 'friends', 'connect', 'share', 'community'],
  authors: [{ name: 'Facebook Clone Team' }],
  creator: 'Facebook Clone',
  publisher: 'Facebook Clone',
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://facebook-clone.com',
    siteName: 'Facebook Clone',
    title: 'Facebook - Connect with Friends',
    description: 'Connect with friends, family and other people you know.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Facebook Clone',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Facebook - Connect with Friends',
    description: 'Connect with friends, family and other people you know.',
    images: ['/og-image.png'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <ApolloWrapper>
          <QueryProvider>
            <ToastProvider>
              <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {children}
              </main>
            </ToastProvider>
          </QueryProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
