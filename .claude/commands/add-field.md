Add a new field to a Task, Project, or Employee entity in PlanPro.

Arguments: $ARGUMENTS — expected format: "entity: Task, field: priority, type: string, label: Пріоритет, sheetColumn: пріоритет"

## Context

Adding a field requires changes in exactly these files (never miss one):

**For Task:**
1. `lib/types.ts` — add to `Task` interface
2. `lib/sheets.ts` — add column name to `HEADERS.tasks`, parse in `getTasks()`, write in `createTask()` and `updateTask()`
3. `components/modals/task-modal.tsx` — add form field with Ukrainian label

**For Project:**
1. `lib/types.ts` — add to `Project` interface
2. `lib/sheets.ts` — add column name to `HEADERS.projects`, parse in `getProjects()`, write in `createProject()` and `updateProject()`
3. `components/modals/project-modal.tsx` — add form field with Ukrainian label

**For Employee:**
1. `lib/types.ts` — add to `Employee` interface
2. `lib/sheets.ts` — add column name to `HEADERS.employees`, parse in `getEmployees()`, write in `createEmployee()` and `updateEmployee()`
3. `components/modals/employee-modal.tsx` — add form field with Ukrainian label

## Steps

1. **Parse arguments** — extract `entity`, `field` (camelCase TypeScript name), `type` (TypeScript type), `label` (Ukrainian display name), `sheetColumn` (Ukrainian column header for Google Sheets).

2. **`lib/types.ts`** — add the field to the interface. If optional, use `field?: type`. If required, use `field: type`.

3. **`lib/sheets.ts`** — make ALL of these changes:
   - Add `sheetColumn` to the `HEADERS.<entity>` array (at the end)
   - In `get<Entity>()`: add `field: raw['sheetColumn']` to the returned object (with appropriate parsing: `parseFloat` for numbers, `parseInt` for integers, raw string for strings, `parseIds` for string arrays)
   - In `create<Entity>()`: add the field value to the `appendRow` call (at the end, matching the HEADERS order)
   - In `update<Entity>()`: add the field value to the `updateRow` call (at the end, matching the HEADERS order)

4. **Modal component** — add appropriate input element with Ukrainian label:
   - String → `<Input label="<label>" ... />`
   - Number → `<Input label="<label>" type="number" ... />`
   - Select/enum → `<Select label="<label>" options={[...]} ... />`
   - Add to `form` state initial value (both in the empty-form branch and in the edit-task-load branch of `useEffect`)
   - Add to the `payload` object in `handleSubmit`

5. **Verify column order** — HEADERS array order must exactly match the order of values in `appendRow` and `updateRow`. Count them.

6. **Confirm** — show a summary of every change made across all files.

## Rules
- Sheet column names are always in Ukrainian (lowercase)
- TypeScript field names are always camelCase
- All form labels are in Ukrainian
- Never reorder existing columns in HEADERS — always append new ones at the end
- After making all changes, mentally verify: if I create a new entity and then reload, will the new field appear correctly?
