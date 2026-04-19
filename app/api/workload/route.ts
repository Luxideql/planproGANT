import { NextRequest, NextResponse } from 'next/server'
import { getEmployees, getTasks } from '@/lib/sheets'
import { calculateWorkload } from '@/lib/workload'
import { format, subDays, addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const today = new Date()
    const from = searchParams.get('from') ?? format(subDays(today, 7), 'yyyy-MM-dd')
    const to   = searchParams.get('to')   ?? format(addDays(today, 60), 'yyyy-MM-dd')

    const [employees, tasks] = await Promise.all([getEmployees(), getTasks()])
    const workloads = calculateWorkload(employees, tasks, from, to)

    return NextResponse.json(workloads)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
