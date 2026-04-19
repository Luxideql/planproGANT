'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LayoutDashboard, FolderKanban, GanttChartSquare, Users, Settings, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'

const NAV = [
  { href: '/',          label: 'Дашборд',        icon: LayoutDashboard },
  { href: '/projects',  label: 'Проєкти',         icon: FolderKanban },
  { href: '/gantt',     label: 'Діаграма Ганта',  icon: GanttChartSquare },
  { href: '/team',      label: 'Команда',         icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { open, setOpen } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-full w-60 bg-zinc-950 flex flex-col z-40 transition-transform duration-200',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">PlanPro</p>
              <p className="text-[10px] text-zinc-500">Виробниче планування</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-zinc-800 space-y-0.5">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 shrink-0" />
              : <Moon className="h-4 w-4 shrink-0" />
            }
            {theme === 'dark' ? 'Світла тема' : 'Темна тема'}
          </button>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4" />
            Налаштування
          </Link>
        </div>
      </aside>
    </>
  )
}
