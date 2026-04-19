import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/sheets'
import { detectCycle, cascadeDates } from '@/lib/scheduler'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json(tasks)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const allTasks = await getTasks()
    const mockNew = { ...body, id: '__new__' }
    const { hasCycle } = detectCycle([...allTasks, mockNew])
    if (hasCycle) {
      return NextResponse.json({ error: 'Виявлено циклічну залежність' }, { status: 400 })
    }
    const task = await createTask(body)
    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { cascade } = body

    let allTasks = await getTasks()

    // Validate no cycle
    const { hasCycle } = detectCycle(allTasks.map(t => t.id === body.id ? body : t))
    if (hasCycle) {
      return NextResponse.json({ error: 'Виявлено циклічну залежність' }, { status: 400 })
    }

    // Cascade date changes to dependents if requested
    if (cascade && body.endDate) {
      const original = allTasks.find(t => t.id === body.id)
      if (original && original.endDate !== body.endDate) {
        allTasks = cascadeDates(allTasks, body.id, body.endDate)
        for (const t of allTasks) {
          if (t.id !== body.id) await updateTask(t)
        }
      }
    }

    await updateTask(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await deleteTask(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
