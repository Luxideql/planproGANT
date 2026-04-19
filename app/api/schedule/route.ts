import { NextRequest, NextResponse } from 'next/server'
import { getTasks, getProjects } from '@/lib/sheets'
import { criticalPath, estimateProjectCompletion, detectCycle } from '@/lib/scheduler'
import { isOverdue } from '@/lib/utils'

export async function GET() {
  try {
    const [tasks, projects] = await Promise.all([getTasks(), getProjects()])

    const { hasCycle, cyclePath } = detectCycle(tasks)
    const overdueTaskIds = tasks
      .filter(t => isOverdue(t.endDate, t.status))
      .map(t => t.id)

    const projectSummaries = projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id)
      const completion = estimateProjectCompletion(projectTasks)
      const critical = criticalPath(projectTasks)
      const done = projectTasks.filter(t => t.status === 'completed').length
      const total = projectTasks.length
      const progress = total > 0 ? Math.round((done / total) * 100) : 0
      return {
        project,
        estimatedCompletion: completion,
        criticalPath: critical,
        progress,
        taskCount: total,
        completedCount: done,
        overdueCount: projectTasks.filter(t => isOverdue(t.endDate, t.status)).length,
      }
    })

    return NextResponse.json({
      hasCycle,
      cyclePath,
      overdueTaskIds,
      projectSummaries,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
