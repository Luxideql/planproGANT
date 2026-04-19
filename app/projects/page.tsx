'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TaskModal } from '@/components/modals/task-modal'
import { ProjectModal } from '@/components/modals/project-modal'
import { statusLabel, statusColor, formatDate, isOverdue } from '@/lib/utils'
import type { Project, Task, Employee } from '@/lib/types'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProjectsPage() {
  const { data: projects = [] } = useSWR<Project[]>('/api/projects', fetcher)
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: employees = [] } = useSWR<Employee[]>('/api/employees', fetcher)

  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project | null }>({ open: false })
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null; projectId?: string }>({ open: false })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function saveProject(data: Omit<Project, 'id' | 'createdAt'> | Project) {
    const isEdit = 'id' in data
    await fetch('/api/projects', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate('/api/projects')
    mutate('/api/schedule')
  }

  async function deleteProject(id: string) {
    if (!confirm('Видалити проєкт? Задачі проєкту залишаться в системі.')) return
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    mutate('/api/projects')
    mutate('/api/schedule')
  }

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

  async function deleteTask(id: string) {
    if (!confirm('Видалити задачу?')) return
    await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    mutate('/api/tasks')
    mutate('/api/schedule')
    mutate('/api/workload')
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Проєкти"
        subtitle={`${projects.length} проєктів · ${tasks.length} задач`}
        actions={
          <Button onClick={() => setProjectModal({ open: true })}>
            <Plus className="h-4 w-4" /> Новий проєкт
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-20 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Немає проєктів</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6">Створіть перший проєкт для початку планування</p>
            <Button onClick={() => setProjectModal({ open: true })}>
              <Plus className="h-4 w-4" /> Створити проєкт
            </Button>
          </div>
        )}

        {projects.map(project => {
          const projectTasks = tasks.filter(t => t.projectId === project.id)
          const completedCount = projectTasks.filter(t => t.status === 'completed').length
          const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0
          const isExpanded = expanded.has(project.id)

          return (
            <Card key={project.id}>
              {/* Project header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 rounded-t-xl transition-colors"
                onClick={() => toggleExpanded(project.id)}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: project.color + '20' }}>
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</span>
                    <Badge className={statusColor(project.status)}>{statusLabel(project.status)}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progress} size="sm" className="w-32" color={project.color} />
                    <span className="text-xs text-zinc-400">{completedCount}/{projectTasks.length} задач</span>
                    {project.description && (
                      <span className="text-xs text-zinc-400 truncate max-w-xs">{project.description}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    onClick={e => { e.stopPropagation(); setTaskModal({ open: true, projectId: project.id }) }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={e => { e.stopPropagation(); setProjectModal({ open: true, project }) }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={e => { e.stopPropagation(); deleteProject(project.id) }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                </div>
              </div>

              {/* Tasks list */}
              {isExpanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-700">
                  {projectTasks.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-zinc-400">
                      Немає задач.{' '}
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setTaskModal({ open: true, projectId: project.id })}
                      >
                        Додати задачу
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-700">
                          <th className="px-5 py-2.5 text-left font-medium">Назва</th>
                          <th className="px-3 py-2.5 text-left font-medium">Виконавець</th>
                          <th className="px-3 py-2.5 text-left font-medium">Початок</th>
                          <th className="px-3 py-2.5 text-left font-medium">Кінець</th>
                          <th className="px-3 py-2.5 text-left font-medium">Годин</th>
                          <th className="px-3 py-2.5 text-left font-medium">Прогрес</th>
                          <th className="px-3 py-2.5 text-left font-medium">Статус</th>
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {projectTasks.map(task => {
                          const employee = employees.find(e => e.id === task.assigneeId)
                          const overdue = isOverdue(task.endDate, task.status)
                          return (
                            <tr key={task.id} className="border-b border-zinc-50 dark:border-zinc-700/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/20 transition-colors last:border-0">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  {task.dependencies.length > 0 && (
                                    <span className="text-[10px] text-zinc-400">↳</span>
                                  )}
                                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{task.name}</span>
                                </div>
                                {task.description && (
                                  <div className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{task.description}</div>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {employee && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                      style={{ backgroundColor: employee.color }}>
                                      {employee.name.charAt(0)}
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300">{employee.name}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400 tabular-nums">{formatDate(task.startDate)}</td>
                              <td className={`px-3 py-3 tabular-nums ${overdue ? 'text-red-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                {overdue && '⚠ '}{formatDate(task.endDate)}
                              </td>
                              <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400 tabular-nums">{task.plannedHours}г</td>
                              <td className="px-3 py-3 w-24">
                                <Progress value={task.progress} size="sm" showLabel />
                              </td>
                              <td className="px-3 py-3">
                                <Badge className={statusColor(task.status)}>{statusLabel(task.status)}</Badge>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon"
                                    onClick={() => setTaskModal({ open: true, task })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                  <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-700">
                    <Button variant="ghost" size="sm"
                      onClick={() => setTaskModal({ open: true, projectId: project.id })}>
                      <Plus className="h-3.5 w-3.5" /> Додати задачу
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <ProjectModal
        open={projectModal.open}
        onClose={() => setProjectModal({ open: false })}
        onSave={saveProject}
        project={projectModal.project}
      />

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
