'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { WorkloadHeatmap } from '@/components/workload/workload-heatmap'
import { EmployeeModal } from '@/components/modals/employee-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Employee, EmployeeWorkload } from '@/lib/types'
import { Plus, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, subDays, addDays, addMonths } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TeamPage() {
  const { data: employees = [] } = useSWR<Employee[]>('/api/employees', fetcher)

  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)
  const fromDate = format(addDays(today, weekOffset * 7 - 7), 'yyyy-MM-dd')
  const toDate = format(addDays(today, weekOffset * 7 + 35), 'yyyy-MM-dd')

  const { data: workloads = [] } = useSWR<EmployeeWorkload[]>(
    `/api/workload?from=${fromDate}&to=${toDate}`,
    fetcher,
  )

  const [modal, setModal] = useState<{ open: boolean; employee?: Employee | null }>({ open: false })

  const totalOverloaded = workloads.reduce((s, wl) => s + wl.totalOverloaded, 0)
  const totalConflicts = workloads.reduce((s, wl) => s + wl.conflicts.length, 0)

  async function saveEmployee(data: Omit<Employee, 'id'> | Employee) {
    const isEdit = 'id' in data
    await fetch('/api/employees', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate('/api/employees')
    mutate(`/api/workload?from=${fromDate}&to=${toDate}`)
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Видалити співробітника?')) return
    await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    mutate('/api/employees')
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Команда"
        subtitle={`${employees.length} співробітників`}
        actions={
          <Button onClick={() => setModal({ open: true })}>
            <Plus className="h-4 w-4" /> Додати співробітника
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Alerts */}
        {(totalOverloaded > 0 || totalConflicts > 0) && (
          <div className="flex items-center gap-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-3.5 text-sm text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex items-center gap-3">
              {totalOverloaded > 0 && <span>{totalOverloaded} днів з перевантаженням</span>}
              {totalConflicts > 0 && <span>{totalConflicts} конфліктів задач</span>}
            </div>
          </div>
        )}

        {/* Employees cards */}
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-20 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Немає співробітників</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6">Додайте членів команди для планування задач</p>
            <Button onClick={() => setModal({ open: true })}>
              <Plus className="h-4 w-4" /> Додати першого співробітника
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees.map(emp => {
              const wl = workloads.find(w => w.employee.id === emp.id)
              const overloaded = (wl?.totalOverloaded ?? 0) > 0
              const conflicts = wl?.conflicts.length ?? 0
              return (
                <Card key={emp.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-base font-bold"
                        style={{ backgroundColor: emp.color }}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, employee: emp })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEmployee(emp.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{emp.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{emp.position || 'Без посади'}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">{emp.capacity}г/день</div>
                    <div className="flex flex-wrap gap-1">
                      {wl && (
                        <Badge className="bg-blue-50 text-blue-600">{wl.totalPlanned}г заплановано</Badge>
                      )}
                      {overloaded && (
                        <Badge className="bg-red-100 text-red-600">{wl!.totalOverloaded}д перевантаж.</Badge>
                      )}
                      {conflicts > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">{conflicts} конфл.</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Workload heatmap */}
        {employees.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Завантаження команди</h2>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Поточний період</Button>
                <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <WorkloadHeatmap
              workloads={workloads}
              fromDate={fromDate}
              toDate={toDate}
            />
          </div>
        )}
      </div>

      <EmployeeModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        onSave={saveEmployee}
        employee={modal.employee}
      />
    </div>
  )
}
