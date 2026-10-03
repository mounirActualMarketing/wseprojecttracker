# WSE Strategy System

Plan tracker for the Wall Street English Saudi Arabia growth programme (Clicksalesmedia).
Next.js 16 (App Router) + Tailwind v4 + React Flow.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Views

| Route | View |
| --- | --- |
| `/` | Overview: term progress, KPIs, status mix, progress by system, due soon |
| `/table` | Sortable table with inline status change |
| `/pipeline` | Systems x phases matrix (Discovery, Custom build, Testing, Launch, Optimise), drag to move |
| `/kanban` | Status board (Backlog, To do, In progress, Review, Done), drag to move |
| `/flow` | Flowchart: task dependency graph (connect handles to add dependencies) and systems map |
| `/planner` | Gantt planner over the initial term, drag bars to reschedule or resize |
| `/calendar` | Month calendar by due date, drag chips to reschedule, double-click a day to add |

## Data

- All views share one store: `src/lib/store.ts` (localStorage key `wse-strategy-system:v2`). It persists to the
  browser only (single user, per browser). Replace that module with an API/database for multi-user use.
- Starting plan in `src/lib/seed.ts`: 10 requests to WSE (tag "Request to WSE") and 8 audit gaps (tag "Gap").
  Each task has tags and a checklist.
- Statuses: Backlog, To do, In progress, Waiting, Review, Done.
- The Data menu (sidebar bottom) has Export JSON, Import JSON, Reset to starting plan and Clear all tasks.
- Systems and phases follow Annex A of the agreement (8 AI systems + programme governance), term
  1 Oct 2026 to 31 Dec 2026 (`src/lib/types.ts`).
