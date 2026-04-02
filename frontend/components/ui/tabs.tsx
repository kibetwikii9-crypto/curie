import { createContext, useContext, PropsWithChildren, ReactNode } from 'react'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: ReactNode
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`flex gap-2 ${className}`}>{children}</div>
}

interface TabsTriggerProps {
  value: string
  className?: string
  children: ReactNode
}

export function TabsTrigger({ value, className = '', children }: TabsTriggerProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) return null

  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={`px-3 py-1 rounded-md ${ctx.value === value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} ${className}`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  className?: string
  children: ReactNode
}

export function TabsContent({ value, className = '', children }: TabsContentProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) return null
  if (ctx.value !== value) return null
  return <div className={className}>{children}</div>
}
