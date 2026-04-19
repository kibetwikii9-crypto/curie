import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: {
    default: 'Automify - AI-Powered Chatbot & Marketing Automation Platform',
    template: '%s | Automify',
  },
  description: 'Transform your customer engagement with Automify\'s AI chatbot...',
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



