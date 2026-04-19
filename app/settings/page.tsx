'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function SettingsPage() {
  const [initStatus, setInitStatus] = useState<Status>('idle')
  const [initMessage, setInitMessage] = useState('')

  async function initSheets() {
    setInitStatus('loading')
    try {
      const res = await fetch('/api/init', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInitStatus('success')
        setInitMessage(data.message)
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      setInitStatus('error')
      setInitMessage(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Налаштування" subtitle="Конфігурація системи" />

      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Google Sheets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">
              Ініціалізація таблиці Google Sheets: створення аркушів та заголовків якщо вони відсутні.
            </p>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-xs text-zinc-600 font-mono">
              <div>співробітники — id, імя, посада, годин_на_день, колір</div>
              <div>проєкти — id, назва, колір, статус, опис, створено</div>
              <div>задачі — id, проєкт_id, назва, виконавець_id, початок, кінець, планові_години, прогрес, статус, залежності, опис</div>
              <div>журнал — задача_id, співробітник_id, дата, години</div>
            </div>

            {initStatus !== 'idle' && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                initStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                initStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                {initStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                {initStatus === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {initStatus === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
                {initStatus === 'loading' ? 'Ініціалізація...' : initMessage}
              </div>
            )}

            <Button onClick={initSheets} disabled={initStatus === 'loading'}>
              {initStatus === 'loading' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Ініціалізація...</>
              ) : 'Ініціалізувати таблицю'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Змінні середовища</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600">Для роботи системи необхідно налаштувати:</p>
            <div className="space-y-2">
              {[
                { key: 'GOOGLE_SPREADSHEET_ID', desc: 'ID таблиці Google Sheets з URL' },
                { key: 'GOOGLE_SERVICE_ACCOUNT_JSON', desc: 'JSON сервісного акаунта (одним рядком)' },
              ].map(({ key, desc }) => (
                <div key={key} className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3">
                  <div className="font-mono text-xs font-semibold text-zinc-800">{key}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              Додайте ці змінні у файл <code className="bg-zinc-100 px-1 rounded">.env.local</code> для локальної розробки
              або в налаштування Vercel для продакшну.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
