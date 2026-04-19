import { google } from 'googleapis'
import type { Employee, Project, Task, WorkLogEntry, RawRow } from './types'
import { parseIds } from './utils'

const SHEET_NAMES = {
  employees: 'співробітники',
  projects: 'проєкти',
  tasks: 'задачі',
  worklog: 'журнал',
}

// Column headers (Ukrainian)
const HEADERS = {
  employees: ['id', 'імя', 'посада', 'годин_на_день', 'колір'],
  projects:  ['id', 'назва', 'колір', 'статус', 'опис', 'створено'],
  tasks:     ['id', 'проєкт_id', 'назва', 'виконавець_id', 'початок', 'кінець', 'планові_години', 'прогрес', 'статус', 'залежності', 'опис'],
  worklog:   ['задача_id', 'співробітник_id', 'дата', 'години'],
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// --- Generic helpers ---

async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  })
  return (res.data.values ?? []) as string[][]
}

async function appendRow(sheetName: string, values: (string | number)[]): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

async function updateRow(sheetName: string, rowIndex: number, values: (string | number)[]): Promise<void> {
  const sheets = getSheetsClient()
  const col = String.fromCharCode(64 + values.length)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:${col}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const sheets = getSheetsClient()
  const sheetId = await getSheetId(sheetName)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

async function getSheetId(sheetName: string): Promise<number> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = res.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId == null) throw new Error(`Sheet "${sheetName}" not found`)
  return sheet!.properties!.sheetId!
}

function rowToObject(headers: string[], row: string[]): RawRow {
  const obj: RawRow = {}
  headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
  return obj
}

function findRowIndex(rows: string[][], id: string): number {
  // rows[0] is header, data starts at rows[1], sheet row index starts at 1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1 // 1-indexed sheet row
  }
  return -1
}

// --- Employees ---

export async function getEmployees(): Promise<Employee[]> {
  const rows = await readSheet(SHEET_NAMES.employees)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(r => {
    const raw = rowToObject(HEADERS.employees, r)
    return {
      id: raw['id'],
      name: raw['імя'],
      position: raw['посада'],
      capacity: parseFloat(raw['годин_на_день']) || 8,
      color: raw['колір'] || '#0EA5E9',
    }
  })
}

export async function createEmployee(data: Omit<Employee, 'id'>): Promise<Employee> {
  const { generateId } = await import('./utils')
  const id = generateId()
  await appendRow(SHEET_NAMES.employees, [id, data.name, data.position, data.capacity, data.color])
  return { id, ...data }
}

export async function updateEmployee(employee: Employee): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.employees)
  const rowIdx = findRowIndex(rows, employee.id)
  if (rowIdx === -1) throw new Error('Employee not found')
  await updateRow(SHEET_NAMES.employees, rowIdx, [
    employee.id, employee.name, employee.position, employee.capacity, employee.color,
  ])
}

export async function deleteEmployee(id: string): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.employees)
  const rowIdx = findRowIndex(rows, id)
  if (rowIdx === -1) throw new Error('Employee not found')
  await deleteRow(SHEET_NAMES.employees, rowIdx)
}

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  const rows = await readSheet(SHEET_NAMES.projects)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(r => {
    const raw = rowToObject(HEADERS.projects, r)
    return {
      id: raw['id'],
      name: raw['назва'],
      color: raw['колір'],
      status: raw['статус'] as Project['status'],
      description: raw['опис'],
      createdAt: raw['створено'],
    }
  })
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  const { generateId } = await import('./utils')
  const id = generateId()
  const createdAt = new Date().toISOString().split('T')[0]
  await appendRow(SHEET_NAMES.projects, [id, data.name, data.color, data.status, data.description, createdAt])
  return { id, createdAt, ...data }
}

export async function updateProject(project: Project): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.projects)
  const rowIdx = findRowIndex(rows, project.id)
  if (rowIdx === -1) throw new Error('Project not found')
  await updateRow(SHEET_NAMES.projects, rowIdx, [
    project.id, project.name, project.color, project.status, project.description, project.createdAt,
  ])
}

export async function deleteProject(id: string): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.projects)
  const rowIdx = findRowIndex(rows, id)
  if (rowIdx === -1) throw new Error('Project not found')
  await deleteRow(SHEET_NAMES.projects, rowIdx)
}

// --- Tasks ---

export async function getTasks(): Promise<Task[]> {
  const rows = await readSheet(SHEET_NAMES.tasks)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(r => {
    const raw = rowToObject(HEADERS.tasks, r)
    return {
      id: raw['id'],
      projectId: raw['проєкт_id'],
      name: raw['назва'],
      assigneeId: raw['виконавець_id'],
      startDate: raw['початок'],
      endDate: raw['кінець'],
      plannedHours: parseFloat(raw['планові_години']) || 0,
      progress: parseInt(raw['прогрес']) || 0,
      status: raw['статус'] as Task['status'],
      dependencies: parseIds(raw['залежності']),
      description: raw['опис'],
    }
  })
}

export async function createTask(data: Omit<Task, 'id'>): Promise<Task> {
  const { generateId } = await import('./utils')
  const id = generateId()
  await appendRow(SHEET_NAMES.tasks, [
    id, data.projectId, data.name, data.assigneeId,
    data.startDate, data.endDate, data.plannedHours,
    data.progress, data.status, data.dependencies.join(','), data.description,
  ])
  return { id, ...data }
}

export async function updateTask(task: Task): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.tasks)
  const rowIdx = findRowIndex(rows, task.id)
  if (rowIdx === -1) throw new Error('Task not found')
  await updateRow(SHEET_NAMES.tasks, rowIdx, [
    task.id, task.projectId, task.name, task.assigneeId,
    task.startDate, task.endDate, task.plannedHours,
    task.progress, task.status, task.dependencies.join(','), task.description,
  ])
}

export async function deleteTask(id: string): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.tasks)
  const rowIdx = findRowIndex(rows, id)
  if (rowIdx === -1) throw new Error('Task not found')
  await deleteRow(SHEET_NAMES.tasks, rowIdx)
}

// --- WorkLog ---

export async function getWorkLog(): Promise<WorkLogEntry[]> {
  const rows = await readSheet(SHEET_NAMES.worklog)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(r => {
    const raw = rowToObject(HEADERS.worklog, r)
    return {
      taskId: raw['задача_id'],
      employeeId: raw['співробітник_id'],
      date: raw['дата'],
      hours: parseFloat(raw['години']) || 0,
    }
  })
}

export async function addWorkLogEntry(entry: WorkLogEntry): Promise<void> {
  await appendRow(SHEET_NAMES.worklog, [entry.taskId, entry.employeeId, entry.date, entry.hours])
}

// --- Init sheets (creates headers if sheets exist but are empty) ---

export async function initSheets(): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existingTitles = spreadsheet.data.sheets?.map(s => s.properties?.title ?? '') ?? []

  const requests: object[] = []

  for (const [key, name] of Object.entries(SHEET_NAMES)) {
    if (!existingTitles.includes(name)) {
      requests.push({ addSheet: { properties: { title: name } } })
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    })
  }

  // Write headers to each sheet if first row is empty
  for (const [key, name] of Object.entries(SHEET_NAMES)) {
    const rows = await readSheet(name)
    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS[key as keyof typeof HEADERS]] },
      })
    }
  }
}
