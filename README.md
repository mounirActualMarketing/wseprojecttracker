# WSE Strategy System

Plan tracker for the Wall Street English Saudi Arabia growth programme (Clicksalesmedia).
Next.js 16 (App Router) + Tailwind v4 + React Flow.

## Run

Create `.env.local` (never committed):

```
DATABASE_URL=postgresql://...        # Neon pooled connection string
APP_PASSWORD=choose-a-team-password  # shared password for the site
```

```bash
npm install
npm run db:setup
npm run dev
```

`npm run db:setup` creates the `tasks` table and loads the starting plan only when the table is empty.
It never deletes data, so it is safe to re-run.

## Deploy (Vercel)

Set two environment variables in the Vercel project, then redeploy:

- `DATABASE_URL`: the Neon pooled connection string (added automatically if Neon is connected through Vercel Storage).
- `APP_PASSWORD`: the team password. Without it the deployed site answers 503 on purpose.

The browser asks for a username and password: any username works, the password is `APP_PASSWORD`.

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

- Tasks live in Neon Postgres (`tasks` table, schema in `src/lib/db.ts`), served by `src/app/api/tasks`.
- `src/lib/store.ts` keeps one shared client store for all views: changes show at once, save to the API, and the plan
  refreshes on focus and every 20 seconds. If two people edit the same field, the last save wins.
- `src/proxy.ts` and every API route require the shared password (HTTP Basic auth).
- Starting plan in `src/lib/seed.ts`: the requests to WSE (tag "Request to WSE") and the audit gaps (tag "Gap").
- The Data menu (sidebar bottom) has Export JSON, Import JSON, Reset to starting plan and Clear all tasks. Reset, clear
  and import change the plan for everyone.
- Systems and phases follow Annex A of the agreement (8 AI systems + programme governance), initial term
  1 Oct 2026 to 31 Dec 2026 (`src/lib/types.ts`).
