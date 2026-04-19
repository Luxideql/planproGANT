import { eachDayOfInterval, parseISO, isWeekend, format } from 'date-fns'
import type { Task, Employee, EmployeeWorkload, DayLoad, ConflictEntry } from './types'

function workingDays(start: string, end: string): Date[] {
  return eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
    .filter(d => !isWeekend(d))
}

// Hours per working day for a task
function hoursPerDay(task: Task): number {
  const days = workingDays(task.startDate, task.endDate)
  if (days.length === 0) return 0
  return task.plannedHours / days.length
}

export function calculateWorkload(
  employees: Employee[],
  tasks: Task[],
  fromDate: string,
  toDate: string,
): EmployeeWorkload[] {
  const rangedays = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) })
    .filter(d => !isWeekend(d))

  return employees.map(employee => {
    const assignedTasks = tasks.filter(t => t.assigneeId === employee.id)

    const days: DayLoad[] = rangedays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const taskLoads: DayLoad['tasks'] = []

      for (const task of assignedTasks) {
        const taskDays = workingDays(task.startDate, task.endDate)
        const isInTask = taskDays.some(d => format(d, 'yyyy-MM-dd') === dayStr)
        if (!isInTask) continue

        const hpd = hoursPerDay(task)
        taskLoads.push({
          taskId: task.id,
          taskName: task.name,
          projectId: task.projectId,
          hours: Math.round(hpd * 10) / 10,
        })
      }

      const totalHours = taskLoads.reduce((s, t) => s + t.hours, 0)
      return {
        date: dayStr,
        hours: Math.round(totalHours * 10) / 10,
        capacity: employee.capacity,
        tasks: taskLoads,
      }
    })

    const conflicts: ConflictEntry[] = []
    for (const day of days) {
      if (day.tasks.length > 1) {
        const conflictTasks = assignedTasks.filter(t =>
          day.tasks.some(dt => dt.taskId === t.id)
        )
        conflicts.push({ date: day.date, tasks: conflictTasks })
      }
    }

    const totalPlanned = assignedTasks.reduce((s, t) => s + t.plannedHours, 0)
    const totalOverloaded = days.filter(d => d.hours > d.capacity).length

    return { employee, days, totalPlanned, totalOverloaded, conflicts }
  })
}

// Returns per-day summary across all employees (for overview heatmap)
export function dailyTeamLoad(workloads: EmployeeWorkload[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const wl of workloads) {
    for (const day of wl.days) {
      result.set(day.date, (result.get(day.date) ?? 0) + day.hours)
    }
  }
  return result
}

// Load factor: 0-1 = fine, >1 = overloaded
export function loadFactor(hours: number, capacity: number): number {
  if (capacity === 0) return 0
  return hours / capacity
}

export function loadColor(factor: number): string {
  if (factor === 0) return '#F1F5F9' // empty
  if (factor <= 0.5) return '#BBF7D0' // light green
  if (factor <= 0.8) return '#86EFAC' // green
  if (factor <= 1.0) return '#FDE68A' // yellow
  if (factor <= 1.3) return '#FCA5A5' // light red
  return '#EF4444'                    // red - overloaded
}
