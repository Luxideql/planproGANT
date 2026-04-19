'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from './sidebar-context'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { setOpen } = useSidebar()

  return (
    <header className="h-14 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-4 md:px-6 gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
      </div>
    </header>
  )
}
