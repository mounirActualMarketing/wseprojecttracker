# WSE Strategy System

Plan tracker for the Wall Street English Saudi Arabia growth programme (Clicksalesmedia).
Next.js 16 (App Router) + Tailwind v4 + React Flow.

## Run

Create `.env.local` (never committed):

```
DATABASE_URL=postgresql://...   # Neon pooled connection string
APP_PASSWORD=...                # setup key for creating the first admin
```

```bash
npm install
npm run db:setup
npm run dev
```

`npm run db:setup` creates or upgrades the tables (tasks, teams, systems, users, sessions) and loads the default teams,
systems and starting plan only into empty tables. It never deletes data, so it is safe to re-run.

## Deploy (Vercel)

1. Set `DATABASE_URL` and `APP_PASSWORD` in the Vercel project, then redeploy.
2. Open `/setup` once, enter `APP_PASSWORD` as the setup key, and create the first admin account.
   The page locks itself as soon as one account exists.
3. Invite everyone else from the Team page.

## Accounts and roles

- Email and password sign-in. Passwords are hashed with scrypt; sessions are random tokens stored hashed in the
  `sessions` table (httpOnly cookie, 30 days). 10 wrong passwords lock the account for 15 minutes.
- Invites and password resets are one-time links (valid 7 days) that an admin copies from the Team page and sends
  on WhatsApp or email. The person picks their own password.
- Roles: **Admin** (everything, including team, systems and plan reset), **Member** (create and edit tasks, add
  systems), **Viewer** (read only). Every API route checks the session and role in the database; `src/proxy.ts` only
  redirects visitors without a session cookie to `/login`.

## Views

| Route | View |
| --- | --- |
| `/` | Overview: partnership header, KPIs, requests to WSE, status mix, progress by system, due soon |
| `/table` | Table grouped by status or system, inline status change |
| `/pipeline` | Systems x phases matrix (Discovery, Custom build, Testing, Launch, Optimise), drag to move |
| `/kanban` | Status board, drag to move |
| `/flow` | Flowchart: task dependencies and systems map |
| `/planner` | Gantt planner over the initial term, drag bars to reschedule or resize |
| `/calendar` | Month calendar by due date, drag to reschedule, double-click a day to add |
| `/team` | People by team, roles, workload, invites, reset links, teams |

## Data

- Neon Postgres, schema in `src/lib/db.ts`, API under `src/app/api`.
- Systems and teams live in the database: add or edit systems from the sidebar (admins delete them, moving their
  tasks to another system), manage teams on the Team page.
- Tasks have assignees (people, several allowed) and a responsible team.
- `src/lib/store.ts` keeps one shared client store: changes show at once, save to the API, and everything refreshes
  on focus and every 20 seconds. If two people edit the same field, the last save wins.
- Starting plan in `src/lib/seed.ts`: the requests to WSE and the audit gaps.
- Admin Data menu: Export JSON, Import JSON, Reset to starting plan, Clear all tasks (these change the plan for everyone).
- Initial term 1 Oct 2026 to 31 Dec 2026 (`src/lib/types.ts`).
