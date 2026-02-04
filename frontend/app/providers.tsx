'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // PERFORMANCE OPTIMIZATION: Aggressive caching for speed
            staleTime: 60 * 1000, // Data fresh for 60 seconds (no refetch)
            gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes (was cacheTime)
            refetchOnWindowFocus: false, // Don't refetch when window gains focus
            refetchOnReconnect: false, // Don't refetch on network reconnect
            retry: 1, // Only retry failed requests once (faster failure)
          },
          mutations: {
            retry: 1, // Only retry failed mutations once
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

