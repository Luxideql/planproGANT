'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { SWRConfig } from 'swr'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SWRConfig value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 10000,
        errorRetryCount: 2,
        errorRetryInterval: 5000,
      }}>
        {children}
      </SWRConfig>
    </NextThemesProvider>
  )
}
