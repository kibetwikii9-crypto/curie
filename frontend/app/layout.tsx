import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import StructuredData from '@/components/StructuredData';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Automify - AI-Powered Chatbot & Marketing Automation Platform',
    template: '%s | Automify',
  },
  description: 'Transform your customer engagement with Automify\'s AI chatbot. Automate conversations on WhatsApp, Instagram, and more. Boost sales, reduce support costs, and scale your business 24/7.',
  metadataBase: new URL('https://automifyyai.com'),
  keywords: [
    'AI chatbot',
    'customer support automation',
    'WhatsApp automation',
    'Instagram automation',
    'Facebook Messenger bot',
    'marketing automation',
    'AI assistant',
    'conversational AI',
    'business automation',
    'chatbot platform',
    'multi-channel messaging',
    'AI customer service',
    'automated lead generation',
    'sales automation',
    '24/7 customer support',
  ],
  authors: [{ name: 'Automify', url: 'https://automifyyai.com' }],
  creator: 'Automify',
  publisher: 'Automify',
  openGraph: {
    title: 'Automify - AI-Powered Chatbot & Marketing Automation Platform',
    description: 'Transform your customer engagement with Automify\'s AI chatbot. Automate conversations on WhatsApp, Instagram, and more. Boost sales, reduce support costs, and scale your business 24/7.',
    url: 'https://automifyyai.com',
    siteName: 'Automify',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Automify AI Chatbot Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Automify - AI-Powered Chatbot & Marketing Automation Platform',
    description: 'Transform your customer engagement with Automify\'s AI chatbot. Automate conversations on WhatsApp, Instagram, and more.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  verification: {
    google: 'google-site-verification-code-here',
  },
  alternates: {
    canonical: 'https://automifyyai.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



