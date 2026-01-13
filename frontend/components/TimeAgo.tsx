'use client';

import { useTimeAgo } from '@/lib/hooks/useTimeAgo';

interface TimeAgoProps {
  timestamp: string | null | undefined;
  className?: string;
}

/**
 * Component that displays a relative time string that updates in real-time
 * Example: "2 seconds ago", "5 minutes ago", "1 day ago"
 */
export default function TimeAgo({ timestamp, className = '' }: TimeAgoProps) {
  const timeAgo = useTimeAgo(timestamp);
  
  return <span className={className}>{timeAgo}</span>;
}



