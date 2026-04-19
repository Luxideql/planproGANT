'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FileAttachments } from '@/components/ui/file-attachments'
import type { Task, Project, Employee } from '@/lib/types'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  onSave: (task: Omit<Task, 'id'> | Task) => Promise<void>
  task?: Task | null
  projects: Project[]
  employees: Employee[]
  allTasks: Task[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Очікує' },
  { value: 'in_progress', label: 'В роботі' },
  { value: 'completed', label: 'Завершено' },
  { value: 'blocked', label: 'Заблоковано' },
  { value: 'cancelled', label: 'Скасовано' },
]

export function TaskModal({ open, onClose, onSave, task, projects, employees, allTasks }: TaskModalProps) {
  const isEdit = !!task

  const [form, setForm] = useState({
    projectId: '',
    name: '',
    assigneeId: '',
    startDate: '',
    endDate: '',
    plannedHours: '8',
    progress: '0',
    status: 'pending' as Task['status'],
    dependencies: [] as string[],
    description: '',
    quantity: 0,
    cascade: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setForm({
        projectId: task.projectId,
        name: task.name,
        assigneeId: task.assigneeId,
        startDate: task.startDate,
        endDate: task.endDate,
        plannedHours: String(task.plannedHours),
        progress: String(task.progress),
        status: task.status,
        dependencies: task.dependencies,
        description: task.description,
        quantity: task.quantity ?? 0,
        cascade: false,
      })
    } else {
      setForm({
        projectId: projects[0]?.id ?? '',
        name: '',
        assigneeId: employees[0]?.id ?? '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        plannedHours: '8',
        progress: '0',
        status: 'pending',
        dependencies: [],
        description: '',
        quantity: 0,
        cascade: false,
      })
    }
    setError('')
  }, [task, open])

  const otherTasks = allTasks.filter(t => t.id !== task?.id)

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Вкажіть назву задачі'); return }
    if (!form.projectId) { setError('Оберіть проєкт'); return }
    if (!form.assigneeId) { setError('Оберіть виконавця'); return }
    if (!form.startDate || !form.endDate) { setError('Вкажіть дати'); return }
    if (form.endDate < form.startDate) { setError('Дата кінця не може бути раніше початку'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...(isEdit ? { id: task!.id } : {}),
        projectId: form.projectId,
        name: form.name.trim(),
        assigneeId: form.assigneeId,
        startDate: form.startDate,
        endDate: form.endDate,
        plannedHours: parseFloat(form.plannedHours) || 0,
        progress: parseInt(form.progress) || 0,
        status: form.status,
        dependencies: form.dependencies,
        description: form.description.trim(),
        quantity: parseFloat(String(form.quantity)) || 0,
        ...(isEdit ? { cascade: form.cascade } : {}),
      }
      await onSave(payload as Task)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function toggleDep(id: string) {
    setForm(f => ({
      ...f,
      dependencies: f.dependencies.includes(id)
        ? f.dependencies.filter(d => d !== id)
        : [...f.dependencies, id],
    }))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Редагувати задачу' : 'Нова задача'}
      size="lg"
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
          label="Назва задачі *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Наприклад: Монтаж кабельних лотків"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Проєкт *"
            value={form.projectId}
            onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Оберіть проєкт"
          />
          <Select
            label="Виконавець *"
            value={form.assigneeId}
            onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
            options={employees.map(e => ({ value: e.id, label: e.name }))}
            placeholder="Оберіть виконавця"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Початок *"
            type="date"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
          <Input
            label="Кінець *"
            type="date"
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Input
            label="Планові години"
            type="number"
            min="0"
            value={form.plannedHours}
            onChange={e => setForm(f => ({ ...f, plannedHours: e.target.value }))}
          />
          <Input
            label="Кількість"
            type="number"
            min="0"
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Прогрес %"
            type="number"
            min="0"
            max="100"
            value={form.progress}
            onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
          />
          <Select
            label="Статус"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))}
            options={STATUS_OPTIONS}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">Опис</label>
          <textarea
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Додаткова інформація про задачу..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {otherTasks.length > 0 && (
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Залежності <span className="text-zinc-400 font-normal">(задача стартує після завершення обраних)</span>
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
              {otherTasks.map(t => {
                const project = projects.find(p => p.id === t.projectId)
                const checked = form.dependencies.includes(t.id)
                return (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded accent-blue-600"
                      checked={checked}
                      onChange={() => toggleDep(t.id)}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project?.color ?? '#94A3B8' }}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{t.name}</span>
                    <span className="text-xs text-zinc-400 ml-auto shrink-0">{t.endDate}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded accent-blue-600"
              checked={form.cascade}
              onChange={e => setForm(f => ({ ...f, cascade: e.target.checked }))}
            />
            Каскадно зсунути залежні задачі при зміні дати кінця
          </label>
        )}

        {isEdit && task && (
          <FileAttachments entityType="task" entityId={task.id} />
        )}
      </div>
    </Modal>
  )
}
