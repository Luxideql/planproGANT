'use client'

import { useState, useRef } from 'react'
import useSWR, { mutate } from 'swr'

interface FileItem {
  url: string
  name: string
  size: number
  uploadedAt: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

interface Props {
  entityType: 'task' | 'project'
  entityId: string
}

export function FileAttachments({ entityType, entityId }: Props) {
  const key = `/api/files?entityType=${entityType}&entityId=${entityId}`
  const { data: files = [], isLoading } = useSWR<FileItem[]>(key, fetcher)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('entityType', entityType)
      form.append('entityId', entityId)
      const res = await fetch('/api/files', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Помилка завантаження')
      mutate(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(url: string) {
    setError('')
    try {
      const res = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Помилка видалення')
      }
      mutate(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-zinc-700">Файли</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {uploading ? 'Завантаження...' : '+ Додати файл'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && (
        <div className="text-xs text-red-600 mb-2">{error}</div>
      )}

      {isLoading ? (
        <div className="text-xs text-zinc-400 py-2">Завантаження списку...</div>
      ) : files.length === 0 ? (
        <div className="text-xs text-zinc-400 py-2">Файли не додані</div>
      ) : (
        <ul className="space-y-1">
          {files.map(f => (
            <li key={f.url} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-700/40 px-3 py-2">
              <svg className="w-5 h-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 5h4v1h-4v-1zm0-2h6v1H11v-1zm0 4h3v1h-3v-1z"/>
              </svg>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 truncate flex-1 min-w-0"
                title={f.name}
              >
                {f.name}
              </a>
              <span className="text-xs text-zinc-400 shrink-0">{formatSize(f.size)}</span>
              <button
                type="button"
                onClick={() => handleDelete(f.url)}
                className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
                title="Видалити"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
