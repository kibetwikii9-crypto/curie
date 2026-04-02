import { PropsWithChildren } from 'react'

export function Card({ children, className = '', ...props }: PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`} {...props}>{children}</div>
}

export function CardHeader({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`p-4 border-b border-gray-200 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>
}

export function CardDescription({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
}
