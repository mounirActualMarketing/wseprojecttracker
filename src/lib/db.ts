import { neon } from "@neondatabase/serverless";
import type { ChecklistItem, Role, System, Task, Team, User } from "./types";

// Server-only Neon client. DATABASE_URL comes from .env.local locally and from Vercel env in production.
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

/* ---------- tasks ---------- */

interface TaskRow {
  id: string;
  title: string;
  notes: string;
  system: string;
  status: string;
  phase: string;
  priority: string;
  team_id: string | null;
  assignees: string[];
  start_date: string;
  due_date: string;
  depends_on: string[];
  tags: string[];
  checklist: ChecklistItem[];
}

export const fromRow = (r: TaskRow): Task =>
  ({
    id: r.id,
    title: r.title,
    notes: r.notes,
    system: r.system,
    status: r.status,
    phase: r.phase,
    priority: r.priority,
    team: r.team_id,
    assignees: r.assignees ?? [],
    start: r.start_date,
    due: r.due_date,
    dependsOn: r.depends_on ?? [],
    tags: r.tags ?? [],
    checklist: r.checklist ?? [],
  }) as Task;

// Field -> column, with a coercion so bad input cannot reach the database as the wrong type
export const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const nullable = (v: unknown) => (v === null || v === undefined || v === "" ? null : str(v, 100));
const iso = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);
const strArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x)).slice(0, 200) : []);
const checklist = (v: unknown) =>
  JSON.stringify(
    Array.isArray(v)
      ? v.slice(0, 200).map((c) => ({ id: str(c?.id), text: str(c?.text), done: !!c?.done }))
      : [],
  );

export const COLUMNS: Record<string, { col: string; cast?: string; coerce: (v: unknown) => unknown }> = {
  title: { col: "title", coerce: str },
  notes: { col: "notes", coerce: str },
  system: { col: "system", coerce: str },
  status: { col: "status", coerce: str },
  phase: { col: "phase", coerce: str },
  priority: { col: "priority", coerce: str },
  team: { col: "team_id", coerce: nullable },
  assignees: { col: "assignees", cast: "text[]", coerce: strArr },
  start: { col: "start_date", coerce: iso },
  due: { col: "due_date", coerce: iso },
  dependsOn: { col: "depends_on", cast: "text[]", coerce: strArr },
  tags: { col: "tags", cast: "text[]", coerce: strArr },
  checklist: { col: "checklist", cast: "jsonb", coerce: checklist },
};

/** Parameters for a full insert, in column order of INSERT_SQL. */
export function insertParams(t: Partial<Task>, sort: number) {
  return [
    str(t.id),
    ...Object.keys(COLUMNS).map((k) => COLUMNS[k].coerce((t as Record<string, unknown>)[k])),
    sort,
  ];
}

export const INSERT_SQL = `INSERT INTO tasks (id, title, notes, system, status, phase, priority, team_id, assignees, start_date, due_date, depends_on, tags, checklist, sort)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12::text[], $13::text[], $14::jsonb, $15)`;

/* ---------- people, teams, systems ---------- */

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  team_id: string | null;
  active: boolean;
  password_hash: string | null;
}

export const userFromRow = (r: UserRow): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  team: r.team_id,
  active: r.active,
  pending: !r.password_hash,
});

export const systemFromRow = (r: { id: string; name: string; short: string; color: string }): System => ({
  id: r.id,
  name: r.name,
  short: r.short,
  color: r.color,
});

export const teamFromRow = (r: { id: string; name: string; color: string }): Team => ({ id: r.id, name: r.name, color: r.color });

export const isColor = (v: unknown) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/* ---------- schema (idempotent) ---------- */

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id          text PRIMARY KEY,
    title       text NOT NULL,
    notes       text NOT NULL DEFAULT '',
    system      text NOT NULL,
    status      text NOT NULL,
    phase       text NOT NULL,
    priority    text NOT NULL,
    owner       text NOT NULL DEFAULT '',
    start_date  text NOT NULL,
    due_date    text NOT NULL,
    depends_on  text[] NOT NULL DEFAULT '{}',
    tags        text[] NOT NULL DEFAULT '{}',
    checklist   jsonb NOT NULL DEFAULT '[]',
    sort        integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id text`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees text[] NOT NULL DEFAULT '{}'`,
  `CREATE TABLE IF NOT EXISTS teams (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    color      text NOT NULL,
    sort       integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS systems (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    short      text NOT NULL,
    color      text NOT NULL,
    sort       integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id              text PRIMARY KEY,
    name            text NOT NULL,
    email           text NOT NULL UNIQUE,
    role            text NOT NULL DEFAULT 'member',
    team_id         text,
    password_hash   text,
    active          boolean NOT NULL DEFAULT true,
    failed_logins   integer NOT NULL DEFAULT 0,
    locked_until    timestamptz,
    invite_hash     text,
    invite_expires  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash  text PRIMARY KEY,
    user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  // one-time migration of the old free-text owner into the responsible team
  `UPDATE tasks SET team_id = 'wse' WHERE team_id IS NULL AND owner = 'WSE'`,
  `UPDATE tasks SET team_id = 'csm' WHERE team_id IS NULL AND owner = 'CSM'`,
];
