export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'

export interface Employee {
  id: string
  name: string
  position: string
  capacity: number // hours per day
  color: string
}

export interface Project {
  id: string
  name: string
  color: string
  status: ProjectStatus
  description: string
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  name: string
  assigneeId: string
  startDate: string   // ISO date YYYY-MM-DD
  endDate: string     // ISO date YYYY-MM-DD
  plannedHours: number
  progress: number    // 0-100
  status: TaskStatus
  dependencies: string[] // task ids
  description: string
}

export interface WorkLogEntry {
  taskId: string
  employeeId: string
  date: string        // ISO date YYYY-MM-DD
  hours: number
}

// Computed types
export interface DayLoad {
  date: string
  hours: number
  capacity: number
  tasks: { taskId: string; taskName: string; projectId: string; hours: number }[]
}

export interface EmployeeWorkload {
  employee: Employee
  days: DayLoad[]
  totalPlanned: number
  totalOverloaded: number // number of overloaded days
  conflicts: ConflictEntry[]
}

export interface ConflictEntry {
  date: string
  tasks: Task[]
}

export interface ScheduleValidation {
  hasCycle: boolean
  cyclePath: string[]
  overdueTaskIds: string[]
  conflictsByEmployee: Record<string, ConflictEntry[]>
}

// Raw row from Google Sheets — keyed by Ukrainian column name
export type RawRow = Record<string, string>
