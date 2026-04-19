'use client'

import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { statusLabel, statusColor, formatDate, isOverdue } from '@/lib/utils'
import type { Project, Task, Employee } from '@/lib/types'
import {
  AlertTriangle, CheckCircle2, Users,
  FolderKanban, ListTodo, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ScheduleData {
  hasCycle: boolean
  overdueTaskIds: string[]
  projectSummaries: {
    project: Project
    estimatedCompletion: string | null
    criticalPath: string[]
    progress: number
    taskCount: number
    completedCount: number
    overdueCount: number
  }[]
}

export default function DashboardPage() {
  const { data: projects = [] } = useSWR<Project[]>('/api/projects', fetcher)
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: employees = [] } = useSWR<Employee[]>('/api/employees', fetcher)
  const { data: schedule } = useSWR<ScheduleData>('/api/schedule', fetcher)

  const overdueCount = schedule?.overdueTaskIds.length ?? 0
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const activeProjects = projects.filter(p => p.status === 'active')

  const stats = [
    { label: 'Активних проєктів', value: activeProjects.length, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Задач в роботі', value: inProgressTasks.length, icon: ListTodo, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Завершено задач', value: completedTasks.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Прострочено', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? 'text-red-600' : 'text-zinc-400', bg: overdueCount > 0 ? 'bg-red-50' : 'bg-zinc-50' },
    { label: 'Співробітників', value: employees.length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Всього задач', value: tasks.length, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ]

  const recentTasks = [...tasks]
    .filter(t => t.status !== 'cancelled')
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 8)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Дашборд" subtitle="Огляд виробничого планування" />

      <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
        {schedule?.hasCycle && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Виявлено циклічну залежність між задачами!</span>
            <Link href="/gantt" className="ml-auto text-red-600 underline underline-offset-2 hover:no-underline">Переглянути</Link>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="py-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} dark:bg-white/10 mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Проєкти</CardTitle>
              <Link href="/projects" className="text-xs text-blue-600 hover:underline">Всі проєкти →</Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {(schedule?.projectSummaries.length ?? 0) === 0 && (
                <p className="text-sm text-zinc-400 py-4 text-center">Немає проєктів</p>
              )}
              {schedule?.projectSummaries.map(({ project, progress, taskCount, completedCount, overdueCount: oc, estimatedCompletion }) => (
                <div key={project.id} className="flex items-center gap-3 py-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{project.name}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {oc > 0 && <Badge className="bg-red-100 text-red-600">{oc} прострочено</Badge>}
                        <Badge className={statusColor(project.status)}>{statusLabel(project.status)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} size="sm" className="flex-1" />
                      <span className="text-xs text-zinc-400 tabular-nums">{completedCount}/{taskCount}</span>
                    </div>
                    {estimatedCompletion && (
                      <div className="text-[10px] text-zinc-400 mt-0.5">Завершення: {formatDate(estimatedCompletion)}</div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Найближчі задачі</CardTitle>
              <Link href="/gantt" className="text-xs text-blue-600 hover:underline">Ганта →</Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {recentTasks.length === 0 && (
                <p className="text-sm text-zinc-400 py-4 text-center">Немає задач</p>
              )}
              {recentTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId)
                const employee = employees.find(e => e.id === task.assigneeId)
                const overdue = isOverdue(task.endDate, task.status)
                return (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 dark:border-zinc-700 last:border-0">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project?.color ?? '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{task.name}</div>
                      <div className="text-xs text-zinc-400">{employee?.name ?? '—'} · {project?.name ?? '—'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={statusColor(task.status)}>{statusLabel(task.status)}</Badge>
                      <span className={`text-[10px] ${overdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                        {overdue ? '⚠ ' : ''}{formatDate(task.endDate)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
