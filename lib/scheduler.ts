import type { Task } from './types'
import { addDays, parseISO, differenceInDays, formatISO } from 'date-fns'

// --- Topological sort (Kahn's algorithm) ---

interface Graph {
  nodes: Set<string>
  edges: Map<string, Set<string>> // task -> dependsOn
  reverseEdges: Map<string, Set<string>> // task -> dependents
}

function buildGraph(tasks: Task[]): Graph {
  const nodes = new Set<string>(tasks.map(t => t.id))
  const edges = new Map<string, Set<string>>()
  const reverseEdges = new Map<string, Set<string>>()

  for (const task of tasks) {
    if (!edges.has(task.id)) edges.set(task.id, new Set())
    if (!reverseEdges.has(task.id)) reverseEdges.set(task.id, new Set())

    for (const depId of task.dependencies) {
      if (!nodes.has(depId)) continue
      edges.get(task.id)!.add(depId)
      if (!reverseEdges.has(depId)) reverseEdges.set(depId, new Set())
      reverseEdges.get(depId)!.add(task.id)
    }
  }

  return { nodes, edges, reverseEdges }
}

export function detectCycle(tasks: Task[]): { hasCycle: boolean; cyclePath: string[] } {
  const graph = buildGraph(tasks)
  const visited = new Set<string>()
  const recStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)

    for (const dep of graph.edges.get(nodeId) ?? []) {
      if (!visited.has(dep)) {
        if (dfs(dep)) return true
      } else if (recStack.has(dep)) {
        path.push(dep) // close the cycle
        return true
      }
    }

    recStack.delete(nodeId)
    path.pop()
    return false
  }

  for (const node of graph.nodes) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycle: true, cyclePath: path }
      }
    }
  }

  return { hasCycle: false, cyclePath: [] }
}

export function topologicalSort(tasks: Task[]): Task[] {
  const graph = buildGraph(tasks)
  const inDegree = new Map<string, number>()

  for (const node of graph.nodes) {
    inDegree.set(node, graph.edges.get(node)?.size ?? 0)
  }

  const queue = [...graph.nodes].filter(n => inDegree.get(n) === 0)
  const sorted: string[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)

    for (const dependent of graph.reverseEdges.get(node) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, newDegree)
      if (newDegree === 0) queue.push(dependent)
    }
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]))
  return sorted.map(id => taskMap.get(id)!).filter(Boolean)
}

// --- Cascade date recalculation ---
// When a task's end date changes, shift all dependent tasks forward/backward proportionally

export function cascadeDates(tasks: Task[], changedTaskId: string, newEndDate: string): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]))
  const changedTask = taskMap.get(changedTaskId)
  if (!changedTask) return tasks

  const oldEnd = changedTask.endDate
  const delta = differenceInDays(parseISO(newEndDate), parseISO(oldEnd))

  if (delta === 0) return tasks

  changedTask.endDate = newEndDate
  taskMap.set(changedTaskId, changedTask)

  // BFS through dependents
  const visited = new Set<string>()
  const queue = [changedTaskId]

  const graph = buildGraph(tasks)

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    for (const dependentId of graph.reverseEdges.get(currentId) ?? []) {
      const dep = taskMap.get(dependentId)
      if (!dep) continue

      // Shift the dependent task by the same delta
      const newStart = formatISO(addDays(parseISO(dep.startDate), delta), { representation: 'date' })
      const newEnd = formatISO(addDays(parseISO(dep.endDate), delta), { representation: 'date' })
      dep.startDate = newStart
      dep.endDate = newEnd
      taskMap.set(dependentId, dep)

      queue.push(dependentId)
    }
  }

  return [...taskMap.values()]
}

// --- Project completion estimate ---
// Returns the latest end date among all tasks of a project

export function estimateProjectCompletion(tasks: Task[]): string | null {
  if (tasks.length === 0) return null
  return tasks.reduce((latest, task) => {
    return task.endDate > latest ? task.endDate : latest
  }, tasks[0].endDate)
}

// --- Critical path (simplified: longest dependency chain by duration) ---

export function criticalPath(tasks: Task[]): string[] {
  const { hasCycle } = detectCycle(tasks)
  if (hasCycle) return []

  const sorted = topologicalSort(tasks)
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  // duration[id] = total days from start of chain to end of this task
  const longest = new Map<string, { duration: number; path: string[] }>()

  for (const task of sorted) {
    const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1
    let best = { duration, path: [task.id] }

    for (const depId of task.dependencies) {
      const depData = longest.get(depId)
      if (!depData) continue
      const candidate = depData.duration + duration
      if (candidate > best.duration) {
        best = { duration: candidate, path: [...depData.path, task.id] }
      }
    }

    longest.set(task.id, best)
  }

  // Find the overall longest path
  let maxDuration = 0
  let critPath: string[] = []

  for (const [, data] of longest) {
    if (data.duration > maxDuration) {
      maxDuration = data.duration
      critPath = data.path
    }
  }

  return critPath
}
