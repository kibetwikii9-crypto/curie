import { PropsWithChildren } from 'react'

interface ProgressProps {
  value?: number
  max?: number
  className?: string
}

export function Progress({ value = 0, max = 100, className = '' }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`h-2 w-full rounded bg-gray-200 ${className}`}>
      <div className="h-full rounded bg-blue-600" style={{ width: `${percent}%` }} />
    </div>
  )
}
