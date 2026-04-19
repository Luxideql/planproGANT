Create a new page in the PlanPro app.

Arguments: $ARGUMENTS — expected format: "slug: /foo, title: Назва, subtitle: Підзаголовок, icon: IconName"

## Steps

1. **Parse the arguments** — extract `slug` (e.g. `/reports`), `title`, `subtitle`, and `icon` from $ARGUMENTS.

2. **Create the page file** at `app/<slug>/page.tsx` using this exact pattern:
```tsx
'use client'

import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'
// import other hooks/components as needed

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function <PageName>Page() {
  // const { data = [] } = useSWR<Type[]>('/api/...', fetcher)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="<title>" subtitle="<subtitle>" />
      <div className="flex-1 p-6">
        {/* page content */}
      </div>
    </div>
  )
}
```

3. **Add nav entry** in `components/layout/sidebar.tsx` — insert into the `NAV` array (before the closing bracket, after the last item):
```ts
{ href: '/<slug>', label: '<title>', icon: <IconName> },
```
Also add the icon import from `lucide-react` if not already imported.

4. **Confirm** — list the files created/modified.

## Rules
- All visible text in Ukrainian
- No English strings in the UI
- Follow the exact page pattern — Topbar + `flex flex-col flex-1` wrapper + `flex-1 p-6` content area
- Do not add comments to generated code
