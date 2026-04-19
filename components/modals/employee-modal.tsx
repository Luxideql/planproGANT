'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EMPLOYEE_COLORS } from '@/lib/utils'
import type { Employee } from '@/lib/types'

interface EmployeeModalProps {
  open: boolean
  onClose: () => void
  onSave: (employee: Omit<Employee, 'id'> | Employee) => Promise<void>
  employee?: Employee | null
}

export function EmployeeModal({ open, onClose, onSave, employee }: EmployeeModalProps) {
  const isEdit = !!employee
  const [form, setForm] = useState({ name: '', position: '', capacity: '8', color: EMPLOYEE_COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (employee) {
      setForm({ name: employee.name, position: employee.position, capacity: String(employee.capacity), color: employee.color })
    } else {
      setForm({ name: '', position: '', capacity: '8', color: EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)] })
    }
    setError('')
  }, [employee, open])

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Вкажіть ім'я"); return }
    setSaving(true)
    setError('')
    try {
      const payload = isEdit
        ? { ...employee, name: form.name.trim(), position: form.position.trim(), capacity: parseFloat(form.capacity) || 8, color: form.color }
        : { name: form.name.trim(), position: form.position.trim(), capacity: parseFloat(form.capacity) || 8, color: form.color }
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
      title={isEdit ? 'Редагувати співробітника' : 'Новий співробітник'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Скасувати</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Збереження...' : isEdit ? 'Зберегти' : 'Додати'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <Input
          label="Ім'я *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Іван Петренко"
        />
        <Input
          label="Посада"
          value={form.position}
          onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
          placeholder="Монтажник"
        />
        <Input
          label="Годин на день"
          type="number"
          min="1"
          max="24"
          value={form.capacity}
          onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
        />
        <div>
          <label className="text-sm font-medium text-zinc-700 block mb-2">Колір</label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYEE_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  boxShadow: form.color === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : undefined,
                }}
                onClick={() => setForm(f => ({ ...f, color }))}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
