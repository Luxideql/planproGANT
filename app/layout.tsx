import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'PlanPro — Виробниче планування',
  description: 'Система планування виробництва з діаграмою Ганта',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={`${inter.className} bg-zinc-50`}>
        <Sidebar />
        <main className="ml-60 min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
