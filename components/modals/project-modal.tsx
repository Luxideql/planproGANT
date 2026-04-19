'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PROJECT_COLORS } from '@/lib/utils'
import type { Project } from '@/lib/types'

interface ProjectModalProps {
  open: boolean
  onClose: () => void
  onSave: (project: Omit<Project, 'id' | 'createdAt'> | Project) => Promise<void>
  project?: Project | null
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активний' },
  { value: 'on_hold', label: 'Призупинено' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Скасовано' },
]

export function ProjectModal({ open, onClose, onSave, project }: ProjectModalProps) {
  const isEdit = !!project
  const [form, setForm] = useState({ name: '', color: PROJECT_COLORS[0], status: 'active' as Project['status'], description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (project) {
      setForm({ name: project.name, color: project.color, status: project.status, description: project.description })
    } else {
      setForm({ name: '', color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)], status: 'active', description: '' })
    }
    setError('')
  }, [project, open])

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Вкажіть назву проєкту'); return }
    setSaving(true)
    setError('')
    try {
      const payload = isEdit
        ? { ...project, ...form, name: form.name.trim() }
        : { ...form, name: form.name.trim() }
      await onSave(payload)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Редагувати проєкт' : 'Новий проєкт'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Скасувати</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Збереження...' : isEdit ? 'Зберегти' : 'Створити'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <Input
          label="Назва проєкту *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Наприклад: Монтаж цеху №3"
        />

        <Select
          label="Статус"
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as Project['status'] }))}
          options={STATUS_OPTIONS}
        />

        <div>
          <label className="text-sm font-medium text-zinc-700 block mb-2">Колір проєкту</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: color,
                  boxShadow: form.color === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : undefined,
                }}
                onClick={() => setForm(f => ({ ...f, color }))}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 block mb-1.5">Опис</label>
          <textarea
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Короткий опис проєкту..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}
