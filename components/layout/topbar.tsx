'use client'

import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="h-14 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  )
}
