import { neon } from "@neondatabase/serverless";
import type { ChecklistItem, Task } from "./types";

// Server-only Neon client. DATABASE_URL comes from .env.local locally and from Vercel env in production.
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

interface Row {
  id: string;
  title: string;
  notes: string;
  system: string;
  status: string;
  phase: string;
  priority: string;
  owner: string;
  start_date: string;
  due_date: string;
  depends_on: string[];
  tags: string[];
  checklist: ChecklistItem[];
}

export const fromRow = (r: Row): Task =>
  ({
    id: r.id,
    title: r.title,
    notes: r.notes,
    system: r.system,
    status: r.status,
    phase: r.phase,
    priority: r.priority,
    owner: r.owner,
    start: r.start_date,
    due: r.due_date,
    dependsOn: r.depends_on ?? [],
    tags: r.tags ?? [],
    checklist: r.checklist ?? [],
  }) as Task;

// Task field -> column, with a coercion so bad input cannot reach the database as the wrong type
const str = (v: unknown) => String(v ?? "").slice(0, 2000);
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
  owner: { col: "owner", coerce: str },
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

export const INSERT_SQL = `INSERT INTO tasks (id, title, notes, system, status, phase, priority, owner, start_date, due_date, depends_on, tags, checklist, sort)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12::text[], $13::jsonb, $14)`;

export const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS tasks (
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
)`;
