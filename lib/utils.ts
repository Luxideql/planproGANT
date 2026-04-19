import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy')
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM')
}

export function workingDaysBetween(start: string, end: string): number {
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
  return days.filter(d => !isWeekend(d)).length
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function parseIds(raw: string): string[] {
  if (!raw || raw.trim() === '') return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Очікує',
    in_progress: 'В роботі',
    completed: 'Завершено',
    blocked: 'Заблоковано',
    cancelled: 'Скасовано',
    active: 'Активний',
    on_hold: 'Призупинено',
  }
  return map[status] ?? status
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
    cancelled: 'bg-zinc-100 text-zinc-500',
    active: 'bg-emerald-100 text-emerald-700',
    on_hold: 'bg-amber-100 text-amber-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

export function isOverdue(endDate: string, status: string): boolean {
  if (status === 'completed' || status === 'cancelled') return false
  return new Date(endDate) < new Date(new Date().toDateString())
}

export const PROJECT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1',
]

export const EMPLOYEE_COLORS = [
  '#0EA5E9', '#A855F7', '#F43F5E', '#22C55E',
  '#FB923C', '#14B8A6', '#FACC15', '#E879F9',
]
