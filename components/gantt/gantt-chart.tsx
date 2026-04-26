'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import {
  eachDayOfInterval, parseISO, format, addMonths, startOfMonth,
  endOfMonth, isSameDay, isWeekend, differenceInDays, addDays,
} from 'date-fns'
import { uk } from 'date-fns/locale'
import { useTheme } from 'next-themes'
import type { Task, Project, Employee } from '@/lib/types'
import { isOverdue, formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DAY_WIDTH_BY_MODE = { day: 80, week: 44, month: 20 } as const
const HANDLE_W = 8
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 72
const LABEL_WIDTH = 240

type ViewMode = 'day' | 'week' | 'month'

interface GanttChartProps {
  tasks: Task[]
  projects: Project[]
  employees: Employee[]
  criticalPathIds?: string[]
  onTaskClick?: (task: Task) => void
  onTaskDateChange?: (task: Task, newStart: string, newEnd: string) => void
}

export function GanttChart({
  tasks,
  projects,
  employees,
  criticalPathIds = [],
  onTaskClick,
  onTaskDateChange,
}: GanttChartProps) {
  const [viewOffset, setViewOffset] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [dragging, setDragging] = useState<{
    taskId: string
    mode: 'move' | 'resize-start' | 'resize-end'
    startX: number
    currentX: number
    origStart: string
    origEnd: string
    hasMoved: boolean
  } | null>(null)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const didDragRef = useRef(false)

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const C = useMemo(() => ({
    chartBg:      isDark ? '#18181B' : '#FAFAFA',
    headerBg:     isDark ? '#18181B' : '#FFFFFF',
    projectRowBg: isDark ? '#27272A' : '#F8FAFC',
    taskRowBg:    isDark ? '#18181B' : '#FFFFFF',
    border:       isDark ? '#3F3F46' : '#E4E4E7',
    borderMid:    isDark ? '#52525B' : '#CBD5E1',
    borderStrong: isDark ? '#71717A' : '#94A3B8',
    textPrimary:  isDark ? '#F4F4F5' : '#18181B',
    textSecondary:isDark ? '#A1A1AA' : '#3F3F46',
    textMuted:    isDark ? '#71717A' : '#52525B',
    textVeryMuted:isDark ? '#52525B' : '#A1A1AA',
    todayBg:      isDark ? 'rgba(37,99,235,0.18)' : '#DBEAFE',
    weekendBg:    isDark ? 'rgba(239,68,68,0.10)' : '#FEE2E2',
    todayText:    '#2563EB',
    weekendText:  isDark ? '#F87171' : '#EF4444',
  }), [isDark])

  const today = new Date()
  const DAY_WIDTH = DAY_WIDTH_BY_MODE[viewMode]

  const rangeMonthsBefore = viewMode === 'day' ? 0 : 1
  const rangeMonthsAfter  = viewMode === 'day' ? 1 : viewMode === 'week' ? 2 : 5
  const rangeStart = startOfMonth(addMonths(today, viewOffset - rangeMonthsBefore))
  const rangeEnd   = endOfMonth(addMonths(today, viewOffset + rangeMonthsAfter))

  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const todayIdx = days.findIndex(d => isSameDay(d, today))
    if (todayIdx === -1) return
    const targetX = todayIdx * DAY_WIDTH - el.clientWidth / 2 + DAY_WIDTH / 2
    el.scrollLeft = Math.max(0, targetX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, viewOffset])

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!groups.has(task.projectId)) groups.set(task.projectId, [])
      groups.get(task.projectId)!.push(task)
    }
    return groups
  }, [tasks])

  const rows = useMemo(() => {
    const result: ({ type: 'project'; project: Project } | { type: 'task'; task: Task; project: Project })[] = []
    for (const project of projects) {
      result.push({ type: 'project', project })
      const projectTasks = grouped.get(project.id) ?? []
      for (const task of projectTasks) {
        result.push({ type: 'task', task, project })
      }
    }
    return result
  }, [projects, grouped])

  const totalWidth = days.length * DAY_WIDTH
  const totalHeight = rows.length * ROW_HEIGHT + HEADER_HEIGHT

  function dayX(date: string | Date): number {
    const d = typeof date === 'string' ? parseISO(date) : date
    const idx = days.findIndex(day => isSameDay(day, d))
    if (idx === -1) return -1
    return idx * DAY_WIDTH
  }

  function taskWidth(task: Task): number {
    const startIdx = days.findIndex(d => isSameDay(d, parseISO(task.startDate)))
    const endIdx = days.findIndex(d => isSameDay(d, parseISO(task.endDate)))
    if (startIdx === -1 || endIdx === -1) return 0
    return (endIdx - startIdx + 1) * DAY_WIDTH
  }

  const arrows = useMemo(() => {
    const taskRowIndex = new Map<string, number>()
    let rowIdx = 0
    for (const row of rows) {
      if (row.type === 'task') taskRowIndex.set(row.task.id, rowIdx)
      rowIdx++
    }

    return tasks.flatMap(task =>
      task.dependencies.map(depId => {
        const fromTask = tasks.find(t => t.id === depId)
        if (!fromTask) return null
        const fromRow = taskRowIndex.get(depId) ?? -1
        const toRow = taskRowIndex.get(task.id) ?? -1
        if (fromRow === -1 || toRow === -1) return null

        const x1 = dayX(fromTask.endDate) + DAY_WIDTH
        const y1 = HEADER_HEIGHT + fromRow * ROW_HEIGHT + ROW_HEIGHT / 2
        const x2 = dayX(task.startDate)
        const y2 = HEADER_HEIGHT + toRow * ROW_HEIGHT + ROW_HEIGHT / 2

        return { id: `${depId}-${task.id}`, x1, y1, x2, y2 }
      }).filter(Boolean)
    )
  }, [rows, tasks, days])

  const months = useMemo(() => {
    const result: { label: string; x: number; width: number }[] = []
    let currentMonth = ''

    for (let i = 0; i < days.length; i++) {
      const m = format(days[i], 'LLLL yyyy', { locale: uk })
      if (m !== currentMonth) {
        if (currentMonth) {
          result[result.length - 1].width = i * DAY_WIDTH - result[result.length - 1].x
        }
        result.push({ label: m, x: i * DAY_WIDTH, width: 0 })
        currentMonth = m
      }
    }
    if (result.length > 0) {
      result[result.length - 1].width = days.length * DAY_WIDTH - result[result.length - 1].x
    }
    return result
  }, [days])

  const handleMouseDown = useCallback((
    e: React.MouseEvent, task: Task, mode: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    didDragRef.current = false
    setDragging({ taskId: task.id, mode, startX: e.clientX, currentX: e.clientX, origStart: task.startDate, origEnd: task.endDate, hasMoved: false })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const deltaPx = e.clientX - dragging.startX
    if (Math.abs(deltaPx) < 3) return
    setDragging(d => d ? { ...d, currentX: e.clientX, hasMoved: true } : d)
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    if (!dragging || !dragging.hasMoved) { setDragging(null); return }
    didDragRef.current = true
    const deltaDays = Math.round((dragging.currentX - dragging.startX) / DAY_WIDTH)
    const task = tasks.find(t => t.id === dragging.taskId)
    if (task && deltaDays !== 0) {
      if (dragging.mode === 'move') {
        const newStart = format(addDays(parseISO(dragging.origStart), deltaDays), 'yyyy-MM-dd')
        const newEnd = format(addDays(parseISO(dragging.origEnd), deltaDays), 'yyyy-MM-dd')
        onTaskDateChange?.(task, newStart, newEnd)
      } else if (dragging.mode === 'resize-start') {
        const newStart = format(addDays(parseISO(dragging.origStart), deltaDays), 'yyyy-MM-dd')
        if (newStart < dragging.origEnd) onTaskDateChange?.(task, newStart, dragging.origEnd)
      } else if (dragging.mode === 'resize-end') {
        const newEnd = format(addDays(parseISO(dragging.origEnd), deltaDays), 'yyyy-MM-dd')
        if (newEnd > dragging.origStart) onTaskDateChange?.(task, dragging.origStart, newEnd)
      }
    }
    setDragging(null)
  }, [dragging, tasks, onTaskDateChange, DAY_WIDTH])

  function getDragDates(task: Task): { startDate: string; endDate: string } {
    if (!dragging || dragging.taskId !== task.id) return task
    const deltaDays = Math.round((dragging.currentX - dragging.startX) / DAY_WIDTH)
    if (deltaDays === 0) return task
    if (dragging.mode === 'move') return {
      startDate: format(addDays(parseISO(dragging.origStart), deltaDays), 'yyyy-MM-dd'),
      endDate:   format(addDays(parseISO(dragging.origEnd),   deltaDays), 'yyyy-MM-dd'),
    }
    if (dragging.mode === 'resize-start') {
      const newStart = format(addDays(parseISO(dragging.origStart), deltaDays), 'yyyy-MM-dd')
      return { startDate: newStart < dragging.origEnd ? newStart : task.startDate, endDate: task.endDate }
    }
    const newEnd = format(addDays(parseISO(dragging.origEnd), deltaDays), 'yyyy-MM-dd')
    return { startDate: task.startDate, endDate: newEnd > dragging.origStart ? newEnd : task.endDate }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setViewOffset(v => v - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewOffset(0)}>Сьогодні</Button>
          <Button variant="outline" size="icon" onClick={() => setViewOffset(v => v + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'day' ? 'День' : mode === 'week' ? 'Тиждень' : 'Місяць'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">

        {/* LEFT: sticky label column */}
        <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="relative z-10 border-r border-zinc-200 dark:border-zinc-700">
          <svg width={LABEL_WIDTH} height={totalHeight}>
            {/* Header */}
            <rect x={0} y={0} width={LABEL_WIDTH} height={HEADER_HEIGHT} fill={C.headerBg} />
            <line x1={0} y1={HEADER_HEIGHT} x2={LABEL_WIDTH} y2={HEADER_HEIGHT} stroke={C.border} strokeWidth={1} />

            {/* Row grid lines */}
            {rows.map((_, i) => (
              <line key={i} x1={0} y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={LABEL_WIDTH} y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke={C.border} strokeWidth={1} />
            ))}

            {/* Row labels */}
            {rows.map((row, rowIdx) => {
              const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT
              if (row.type === 'project') {
                return (
                  <g key={`label-project-${row.project.id}`}>
                    <rect x={0} y={y} width={LABEL_WIDTH} height={ROW_HEIGHT} fill={C.projectRowBg} />
                    <rect x={4} y={y + ROW_HEIGHT / 2 - 6} width={3} height={12}
                      fill={row.project.color} rx={2} />
                    <text x={14} y={y + ROW_HEIGHT / 2 + 5} fontSize={13} fontWeight={700}
                      fill={C.textPrimary} className="select-none">
                      {row.project.name}
                    </text>
                  </g>
                )
              }
              const { task } = row
              return (
                <g key={`label-task-${task.id}`}>
                  <rect x={0} y={y} width={LABEL_WIDTH} height={ROW_HEIGHT} fill={C.taskRowBg} />
                  <defs>
                    <clipPath id={`clip-label-${task.id}`}>
                      <rect x={20} y={y} width={LABEL_WIDTH - 24} height={ROW_HEIGHT} />
                    </clipPath>
                  </defs>
                  <text x={20} y={y + ROW_HEIGHT / 2 + 5} fontSize={13} fill={C.textSecondary}
                    className="select-none" clipPath={`url(#clip-label-${task.id})`}>
                    {task.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* RIGHT: scrollable timeline */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <svg
            width={totalWidth}
            height={totalHeight}
            className={dragging?.mode === 'move' ? 'cursor-grabbing' : dragging ? 'cursor-ew-resize' : 'cursor-default'}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background */}
            <rect x={0} y={0} width={totalWidth} height={totalHeight} fill={C.chartBg} />

            {/* Day columns */}
            {days.map((day, i) => {
              const x = i * DAY_WIDTH
              const isToday = isSameDay(day, today)
              const isWE = isWeekend(day)
              return (
                <rect key={i} x={x} y={HEADER_HEIGHT} width={DAY_WIDTH}
                  height={totalHeight - HEADER_HEIGHT}
                  fill={isToday ? C.todayBg : isWE ? C.weekendBg : 'transparent'}
                  opacity={isWE ? 0.7 : 1} />
              )
            })}

            {/* Grid lines (rows) */}
            {rows.map((_, i) => (
              <line key={i} x1={0} y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={totalWidth} y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke={C.border} strokeWidth={1} />
            ))}

            {/* Vertical day lines */}
            {days.map((day, i) => {
              const isMonday = day.getDay() === 1
              const isFirst  = day.getDate() === 1
              if (viewMode === 'month' && !isMonday) return null
              return (
                <line key={i} x1={i * DAY_WIDTH} y1={HEADER_HEIGHT} x2={i * DAY_WIDTH} y2={totalHeight}
                  stroke={isFirst ? C.borderStrong : isMonday ? C.borderMid : C.border}
                  strokeWidth={isFirst ? 1.5 : isMonday ? 1 : 0.5} />
              )
            })}

            {/* Header */}
            <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill={C.headerBg} />
            <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke={C.border} strokeWidth={1} />

            {/* Month labels */}
            {months.map((m, i) => (
              <g key={i}>
                <rect x={m.x} y={0} width={m.width} height={30} fill={C.headerBg} />
                <text x={m.x + 8} y={22} fontSize={13} fontWeight={700} fill={C.textSecondary} className="select-none">
                  {m.label}
                </text>
              </g>
            ))}

            {/* Day labels */}
            {days.map((day, i) => {
              const x = i * DAY_WIDTH
              const isToday = isSameDay(day, today)
              const isWE = isWeekend(day)
              const isMonday = day.getDay() === 1

              if (viewMode === 'month' && !isMonday) return null

              const dateColor = isToday ? C.todayText : isWE ? C.weekendText : C.textMuted
              const subColor  = isToday ? C.todayText : isWE ? C.weekendText : C.textVeryMuted

              if (viewMode === 'month') {
                return (
                  <g key={i}>
                    <text x={x + 4} y={46} fontSize={11} fontWeight={500}
                      fill={dateColor} className="select-none">
                      {format(day, 'd MMM', { locale: uk })}
                    </text>
                  </g>
                )
              }

              const cellBg = isToday ? C.todayBg : isWE ? C.weekendBg : C.headerBg
              return (
                <g key={i}>
                  <rect x={x} y={30} width={DAY_WIDTH} height={HEADER_HEIGHT - 30}
                    fill={cellBg} stroke={C.border} strokeWidth={0.5} />
                  <text x={x + DAY_WIDTH / 2} y={48} textAnchor="middle"
                    fontSize={viewMode === 'day' ? 16 : 14}
                    fill={dateColor} fontWeight={isToday ? 700 : 600}
                    className="select-none">
                    {format(day, 'd')}
                  </text>
                  <text x={x + DAY_WIDTH / 2} y={64} textAnchor="middle"
                    fontSize={viewMode === 'day' ? 13 : 12}
                    fill={subColor} fontWeight={isToday ? 700 : 400}
                    className="select-none">
                    {format(day, 'EE', { locale: uk }).slice(0, 2)}
                  </text>
                </g>
              )
            })}

            {/* Today line */}
            {(() => {
              const x = dayX(today)
              if (x < 0) return null
              return (
                <line x1={x + DAY_WIDTH / 2} y1={0} x2={x + DAY_WIDTH / 2} y2={totalHeight}
                  stroke="#2563EB" strokeWidth={2} strokeDasharray="4,3" opacity={0.7} />
              )
            })()}

            {/* Task bars */}
            {rows.map((row, rowIdx) => {
              if (row.type === 'project') return null
              const { task, project } = row
              const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT
              const dragDates = getDragDates(task)
              const x = dayX(dragDates.startDate)
              const w = (() => {
                const si = days.findIndex(d => isSameDay(d, parseISO(dragDates.startDate)))
                const ei = days.findIndex(d => isSameDay(d, parseISO(dragDates.endDate)))
                return si === -1 || ei === -1 ? 0 : (ei - si + 1) * DAY_WIDTH
              })()
              const barY = y + 8
              const barH = ROW_HEIGHT - 16
              const overdue = isOverdue(task.endDate, task.status)
              const isCritical = criticalPathIds.includes(task.id)
              const isHovered = hoveredTask === task.id
              const employee = employeeMap.get(task.assigneeId)
              const barColor = overdue ? '#EF4444' : project.color

              if (x < 0 || w <= 0) return null

              return (
                <g key={`bar-${task.id}`}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => { if (!didDragRef.current) onTaskClick?.(task) }}
                >
                  {isCritical && (
                    <rect x={x} y={barY - 2} width={w} height={barH + 4}
                      rx={barH / 2 + 2} fill="none" stroke="#F59E0B"
                      strokeWidth={2} opacity={0.8} />
                  )}
                  <rect x={x} y={barY} width={w} height={barH}
                    rx={barH / 2} fill={barColor} opacity={isHovered ? 1 : 0.85}
                    style={{ cursor: onTaskDateChange ? 'grab' : 'pointer' }}
                    onMouseDown={onTaskDateChange ? e => handleMouseDown(e, task, 'move') : undefined}
                  />

                  {task.progress > 0 && (
                    <>
                      <defs>
                        <clipPath id={`bar-clip-${task.id}`}>
                          <rect x={x} y={barY} width={w} height={barH} rx={barH / 2} />
                        </clipPath>
                      </defs>
                      <rect x={x} y={barY}
                        width={Math.max(barH, w * task.progress / 100)}
                        height={barH} rx={barH / 2} fill={barColor}
                        clipPath={`url(#bar-clip-${task.id})`}
                        style={{ cursor: onTaskDateChange ? 'grab' : 'pointer' }}
                        onMouseDown={onTaskDateChange ? e => handleMouseDown(e, task, 'move') : undefined}
                      />
                      <rect x={x} y={barY}
                        width={Math.max(barH, w * task.progress / 100)}
                        height={barH} rx={barH / 2} fill="rgba(0,0,0,0.15)"
                        clipPath={`url(#bar-clip-${task.id})`}
                        style={{ pointerEvents: 'none' }}
                      />
                    </>
                  )}

                  {w > 60 && (
                    <text x={x + 12} y={barY + barH / 2 + 4} fontSize={12}
                      fill="white" fontWeight={600} className="select-none"
                      style={{ pointerEvents: 'none' }}
                      clipPath={task.progress > 0 ? `url(#bar-clip-${task.id})` : undefined}>
                      {task.progress > 0 ? `${task.progress}%` : employee?.name ?? ''}
                    </text>
                  )}

                  {/* Left resize handle */}
                  {onTaskDateChange && (
                    <rect x={x} y={barY} width={HANDLE_W} height={barH}
                      rx={barH / 2} fill="rgba(0,0,0,0.2)"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => handleMouseDown(e, task, 'resize-start')}
                    />
                  )}

                  {/* Right resize handle */}
                  {onTaskDateChange && (
                    <rect x={x + w - HANDLE_W} y={barY} width={HANDLE_W} height={barH}
                      rx={barH / 2} fill="rgba(0,0,0,0.2)"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => handleMouseDown(e, task, 'resize-end')}
                    />
                  )}

                  {employee && (
                    <circle cx={x + w + 10} cy={barY + barH / 2} r={7} fill={employee.color} />
                  )}
                </g>
              )
            })}

            {/* Dependency arrows */}
            {arrows.map(arrow => {
              if (!arrow) return null
              const { id, x1, y1, x2, y2 } = arrow
              const midX = (x1 + x2) / 2
              return (
                <g key={id}>
                  <path d={`M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`}
                    fill="none" stroke={C.borderStrong} strokeWidth={1.5}
                    strokeDasharray="4,3" markerEnd={`url(#arrowhead-${isDark ? 'dark' : 'light'})`} />
                </g>
              )
            })}

            <defs>
              <marker id="arrowhead-light" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 Z" fill="#94A3B8" />
              </marker>
              <marker id="arrowhead-dark" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 Z" fill="#52525B" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded-full bg-blue-500 opacity-40" />
          <span>Задача</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded-full bg-blue-500" />
          <span>Прогрес</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded-full bg-red-500 opacity-85" />
          <span>Прострочено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-8 rounded-full bg-amber-400 opacity-85" />
          <span>Критичний шлях</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Сьогодні</span>
        </div>
      </div>
    </div>
  )
}
