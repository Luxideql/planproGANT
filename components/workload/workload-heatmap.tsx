'use client'

import { useMemo } from 'react'
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns'
import { uk } from 'date-fns/locale'
import type { EmployeeWorkload } from '@/lib/types'
import { loadColor, loadFactor } from '@/lib/workload'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WorkloadHeatmapProps {
  workloads: EmployeeWorkload[]
  fromDate: string
  toDate: string
}

export function WorkloadHeatmap({ workloads, fromDate, toDate }: WorkloadHeatmapProps) {
  const days = useMemo(() =>
    eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) })
      .filter(d => !isWeekend(d)),
    [fromDate, toDate],
  )

  const weeks = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let currentWeek: Date[] = []
    let currentLabel = ''

    for (const day of days) {
      const weekLabel = `${format(day, 'dd', { locale: uk })} ${format(day, 'LLL', { locale: uk })}`
      const weekNum = format(day, 'w')

      if (weekNum !== currentLabel) {
        if (currentWeek.length > 0) result.push({ label: `Тиж. ${currentLabel}`, days: currentWeek })
        currentWeek = [day]
        currentLabel = weekNum
      } else {
        currentWeek.push(day)
      }
    }
    if (currentWeek.length > 0) result.push({ label: `Тиж. ${currentLabel}`, days: currentWeek })
    return result
  }, [days])

  if (workloads.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-100 bg-white p-12 text-center text-sm text-zinc-400">
        Немає даних про завантаження
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-100 bg-white overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-700 border-b border-zinc-100 w-44">
              Співробітник
            </th>
            {days.map(day => (
              <th
                key={day.toISOString()}
                className="px-0 py-2 border-b border-zinc-100 text-center font-normal text-zinc-400 min-w-[36px]"
              >
                <div>{format(day, 'EEE', { locale: uk }).slice(0, 2)}</div>
                <div className="font-medium text-zinc-600">{format(day, 'd')}</div>
              </th>
            ))}
            <th className="px-4 py-3 border-b border-zinc-100 text-right text-xs font-semibold text-zinc-700 whitespace-nowrap">
              Підсумок
            </th>
          </tr>
        </thead>
        <tbody>
          {workloads.map(wl => {
            const dayMap = new Map(wl.days.map(d => [d.date, d]))
            const overloaded = wl.totalOverloaded > 0
            const hasConflicts = wl.conflicts.length > 0

            return (
              <tr key={wl.employee.id} className="group hover:bg-zinc-50/50 transition-colors">
                {/* Employee name */}
                <td className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50/50 px-4 py-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: wl.employee.color }}
                    >
                      {wl.employee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-800 truncate">{wl.employee.name}</div>
                      <div className="text-[10px] text-zinc-400">{wl.employee.position}</div>
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayLoad = dayMap.get(dateStr)
                  const hours = dayLoad?.hours ?? 0
                  const capacity = wl.employee.capacity
                  const factor = loadFactor(hours, capacity)
                  const color = loadColor(factor)
                  const isConflict = wl.conflicts.some(c => c.date === dateStr)

                  return (
                    <td key={dateStr} className="px-0.5 py-1.5 border-b border-zinc-100">
                      <Tooltip
                        content={
                          hours > 0 ? (
                            <div className="space-y-1">
                              <div className="font-semibold">{format(day, 'dd MMM', { locale: uk })}</div>
                              <div>{hours}г / {capacity}г</div>
                              {isConflict && <div className="text-amber-300">⚠ Конфлікт задач</div>}
                              {dayLoad?.tasks.map(t => (
                                <div key={t.taskId} className="text-zinc-300">{t.taskName}: {t.hours}г</div>
                              ))}
                            </div>
                          ) : format(day, 'dd MMM', { locale: uk })
                        }
                        side="top"
                      >
                        <div
                          className={cn(
                            'mx-auto h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-medium transition-all cursor-default',
                            isConflict && 'ring-2 ring-amber-400 ring-offset-1',
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {hours > 0 ? hours : ''}
                        </div>
                      </Tooltip>
                    </td>
                  )
                })}

                {/* Summary */}
                <td className="px-4 py-2 border-b border-zinc-100 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold text-zinc-800">{wl.totalPlanned}г</span>
                    <div className="flex gap-1">
                      {overloaded && (
                        <Badge className="bg-red-100 text-red-600">
                          {wl.totalOverloaded}д перевантаж.
                        </Badge>
                      )}
                      {hasConflicts && (
                        <Badge className="bg-amber-100 text-amber-700">
                          {wl.conflicts.length} конфл.
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-zinc-100 flex items-center gap-4 text-xs text-zinc-500">
        <span className="font-medium">Завантаження:</span>
        {[
          { color: '#BBF7D0', label: '< 50%' },
          { color: '#86EFAC', label: '50–80%' },
          { color: '#FDE68A', label: '80–100%' },
          { color: '#FCA5A5', label: '100–130%' },
          { color: '#EF4444', label: '> 130%' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="h-4 w-4 rounded ring-2 ring-amber-400 ring-offset-1 bg-zinc-100" />
          <span>Конфлікт задач</span>
        </div>
      </div>
    </div>
  )
}
