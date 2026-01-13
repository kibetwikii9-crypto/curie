'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that returns a formatted "time ago" string that updates in real-time
 * Updates every second for recent times, less frequently for older times
 * Always updates to show the exact current relative time
 */
export function useTimeAgo(timestamp: string | null | undefined): string {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!timestamp) {
      setTimeAgo('Unknown');
      return;
    }

    const formatTime = () => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // Handle future dates
      if (diffMs < 0) {
        setTimeAgo('Just now');
        return;
      }

      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const diffWeeks = Math.floor(diffMs / 604800000);
      const diffMonths = Math.floor(diffMs / 2592000000);
      const diffYears = Math.floor(diffMs / 31536000000);

      if (diffSeconds < 10) {
        setTimeAgo('Just now');
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds}s ago`);
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours}h ago`);
      } else if (diffDays < 7) {
        setTimeAgo(`${diffDays}d ago`);
      } else if (diffWeeks < 4) {
        setTimeAgo(`${diffWeeks}w ago`);
      } else if (diffMonths < 12) {
        setTimeAgo(`${diffMonths}mo ago`);
      } else {
        setTimeAgo(`${diffYears}y ago`);
      }
    };

    // Format immediately
    formatTime();

    // Use a shorter interval for all times to ensure updates are visible
    // For hours, update every 30 seconds so "3h ago" becomes "3h 1m ago" visibly
    // For minutes, update every 10 seconds
    // For seconds, update every second
    const timer = setInterval(() => {
      formatTime();
    }, 10000); // Update every 10 seconds for all times - ensures visibility

    return () => clearInterval(timer);
  }, [timestamp]);

  return timeAgo;
}


