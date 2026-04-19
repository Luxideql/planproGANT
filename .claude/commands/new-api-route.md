Create a new API route in the PlanPro app.

Arguments: $ARGUMENTS — expected format: "path: /api/foo, methods: GET POST PUT DELETE, entity: Foo"

## Steps

1. **Parse arguments** — extract `path` (e.g. `/api/reports`), `methods` (space-separated list), and `entity` (the data entity name, e.g. `Report`).

2. **Determine imports** — based on the entity, import the relevant functions from `@/lib/sheets` (e.g. `getReports`, `createReport`, `updateReport`, `deleteReport`). If these don't exist yet, note that they need to be added to `lib/sheets.ts`.

3. **Create** `app<path>/route.ts` using this exact pattern for each requested method:

```ts
import { NextRequest, NextResponse } from 'next/server'
// import relevant functions from '@/lib/sheets'

export async function GET() {
  try {
    const data = await getThings()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await createThing(body)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    await updateThing(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await deleteThing(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

4. **Only include** the methods requested in arguments — omit the rest.

5. **Confirm** — show the created file path and list which methods were included. If new `lib/sheets.ts` functions are needed, list them explicitly so they can be added next.

## Rules
- Every handler must be wrapped in try/catch returning `{ error: String(e) }` with status 500
- No auth, no middleware — internal tool only
- `GET` handlers take no arguments (use `NextRequest` only if query params needed)
- `DELETE` expects `{ id }` in request body
- `PUT` expects full entity object in request body
