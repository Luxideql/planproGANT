'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { GanttChart } from '@/components/gantt/gantt-chart'
import { TaskModal } from '@/components/modals/task-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project, Task, Employee } from '@/lib/types'
import { Plus, AlertTriangle, Route } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ScheduleData {
  hasCycle: boolean
  cyclePath: string[]
  overdueTaskIds: string[]
  projectSummaries: { project: Project; criticalPath: string[] }[]
}

export default function GanttPage() {
  const { data: projects = [] } = useSWR<Project[]>('/api/projects', fetcher)
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: employees = [] } = useSWR<Employee[]>('/api/employees', fetcher)
  const { data: schedule } = useSWR<ScheduleData>('/api/schedule', fetcher)

  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null }>({ open: false })
  const [showCritical, setShowCritical] = useState(false)
  const [filterProject, setFilterProject] = useState<string>('all')

  const criticalPathIds = showCritical
    ? (schedule?.projectSummaries.flatMap(s => s.criticalPath) ?? [])
    : []

  const filteredTasks = filterProject === 'all'
    ? tasks
    : tasks.filter(t => t.projectId === filterProject)

  const filteredProjects = filterProject === 'all'
    ? projects
    : projects.filter(p => p.id === filterProject)

  async function saveTask(data: Omit<Task, 'id'> | Task) {
    const isEdit = 'id' in data
    await fetch('/api/tasks', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate('/api/tasks')
    mutate('/api/schedule')
    mutate('/api/workload')
  }

  async function handleDateChange(task: Task, newStart: string, newEnd: string) {
    const updated = { ...task, startDate: newStart, endDate: newEnd, cascade: true }
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    mutate('/api/tasks')
    mutate('/api/schedule')
    mutate('/api/workload')
  }

  const overdueCount = filteredTasks.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' && t.endDate < new Date().toISOString().split('T')[0]
  ).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Діаграма Ганта"
        subtitle={`${filteredTasks.length} задач · ${filteredProjects.length} проєктів`}
        actions={
          <Button onClick={() => setTaskModal({ open: true })}>
            <Plus className="h-4 w-4" /> Нова задача
          </Button>
        }
      />

      <div className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Project filter */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5">
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterProject === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              onClick={() => setFilterProject('all')}
            >
              Всі проєкти
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterProject === p.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                onClick={() => setFilterProject(p.id)}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} прострочено
              </Badge>
            )}
            <Button
              variant={showCritical ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCritical(v => !v)}
            >
              <Route className="h-3.5 w-3.5" />
              Критичний шлях
            </Button>
          </div>
        </div>

        {/* Cycle warning */}
        {schedule?.hasCycle && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Циклічна залежність між задачами. Перевірте залежності.</span>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-20 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Немає даних для відображення</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">Спочатку створіть проєкти та задачі</p>
          </div>
        ) : (
          <GanttChart
            tasks={filteredTasks}
            projects={filteredProjects}
            employees={employees}
            criticalPathIds={criticalPathIds}
            onTaskClick={task => setTaskModal({ open: true, task })}
            onTaskDateChange={handleDateChange}
          />
        )}
      </div>

      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        onSave={saveTask}
        task={taskModal.task}
        projects={projects}
        employees={employees}
        allTasks={tasks}
      />
    </div>
  )
}
