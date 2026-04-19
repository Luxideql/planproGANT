import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SidebarProvider } from '@/components/layout/sidebar-context'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'PlanPro — Виробниче планування',
  description: 'Система планування виробництва з діаграмою Ганта',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <Sidebar />
            <main className="md:ml-60 min-h-screen flex flex-col">
              {children}
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
