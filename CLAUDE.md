@AGENTS.md

# PlanPro — Виробниче планування

## Stack
- Next.js 16.2 + React 19 + TypeScript (strict)
- Google Sheets as the database (via `googleapis`)
- SWR for data fetching on the client
- Tailwind CSS v4 + Radix UI primitives
- `date-fns` for all date operations (locale: `uk`)

## Architecture

### Data layer — Google Sheets
The database is a Google Sheets spreadsheet. Sheet names and ALL column headers are in Ukrainian:

| Sheet           | Name          | Columns (in order)                                                                                      |
|-----------------|---------------|---------------------------------------------------------------------------------------------------------|
| employees       | `співробітники` | id, імя, посада, годин_на_день, колір                                                                   |
| projects        | `проєкти`      | id, назва, колір, статус, опис, створено                                                                |
| tasks           | `задачі`       | id, проєкт_id, назва, виконавець_id, початок, кінець, планові_години, прогрес, статус, залежності, опис |
| worklog         | `журнал`       | задача_id, співробітник_id, дата, години                                                                |

All Sheets CRUD lives in `lib/sheets.ts`. Never import `googleapis` anywhere else.

### API routes — `app/api/`
Every route follows this exact pattern:
```ts
export async function GET() {
  try {
    const data = await getSomething()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```
No middleware, no auth — internal tool only.

### Pages — `app/`
Every page follows this pattern:
```tsx
'use client'
import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'
const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function FooPage() {
  const { data = [] } = useSWR<Foo[]>('/api/foo', fetcher)
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="..." subtitle="..." actions={...} />
      <div className="flex-1 p-6 ...">...</div>
    </div>
  )
}
```

### Navigation — Sidebar
Nav items are defined in `components/layout/sidebar.tsx` in the `NAV` array. When adding a new page, always add a nav entry there too (except Settings which is pinned at the bottom).

## Conventions

### Dates
- Internal format is always `YYYY-MM-DD` (ISO date string, no time)
- Display with `formatDate()` from `lib/utils.ts` → renders as `dd.MM.yyyy`
- Parse with `parseISO()` from `date-fns`

### IDs
Generated with `generateId()` from `lib/utils.ts` (base36 timestamp + random).

### Colors
- Project colors: use from `PROJECT_COLORS` array in `lib/utils.ts`
- Employee colors: use from `EMPLOYEE_COLORS` array in `lib/utils.ts`

### UI language
**All user-facing text is in Ukrainian.** No English strings in the UI. Status labels come from `statusLabel()` in `lib/utils.ts`.

### Status values
- Task: `'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'`
- Project: `'active' | 'completed' | 'on_hold' | 'cancelled'`

## Key utilities (`lib/`)
- `lib/utils.ts` — `cn`, `formatDate`, `formatDateShort`, `workingDaysBetween`, `generateId`, `parseIds`, `statusLabel`, `statusColor`, `isOverdue`, `PROJECT_COLORS`, `EMPLOYEE_COLORS`
- `lib/types.ts` — all shared types
- `lib/sheets.ts` — all Google Sheets CRUD
- `lib/scheduler.ts` — `detectCycle`, `topologicalSort`, `cascadeDates`, `estimateProjectCompletion`, `criticalPath`
- `lib/workload.ts` — workload calculation

## UI Components
Reusable primitives are in `components/ui/`:
`Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Input`, `Select`, `Modal`, `Progress`, `Tooltip`

Modals in `components/modals/`:
`TaskModal`, `ProjectModal`, `EmployeeModal` — each receives `open`, `onClose`, `onSave` props.

## Google Sheets setup
Credentials are in env var `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON string).
Spreadsheet ID is in `GOOGLE_SPREADSHEET_ID`.
The `/api/init` route creates missing sheets and writes headers.

## What NOT to do
- Do not bypass the `lib/sheets.ts` abstraction
- Do not add caching layers on top of SWR without discussion — Sheets API quotas matter
- Do not add English text to the UI
- Do not use `gantt-task-react` (installed but unused — custom SVG gantt is in `components/gantt/gantt-chart.tsx`)
- Do not add `console.log` to production code
