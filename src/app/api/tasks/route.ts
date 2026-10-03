import { requireUser } from "@/lib/auth";
import { db, fromRow, INSERT_SQL, insertParams } from "@/lib/db";
import type { Task } from "@/lib/types";

// GET: all tasks (signed in). POST: create one (member). PUT: replace the whole plan (admin: reset, clear, import).

export async function GET(request: Request) {
  const user = await requireUser(request, "viewer");
  if (user instanceof Response) return user;
  const sql = db();
  const rows = await sql.query("SELECT * FROM tasks ORDER BY sort, created_at");
  return Response.json(rows.map((r) => fromRow(r as Parameters<typeof fromRow>[0])));
}

export async function POST(request: Request) {
  const user = await requireUser(request, "member");
  if (user instanceof Response) return user;
  const task = (await request.json()) as Partial<Task>;
  if (!task.id || !task.title) return Response.json({ error: "id and title are required" }, { status: 400 });
  const sql = db();
  const [{ next }] = (await sql.query("SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM tasks")) as { next: number }[];
  await sql.query(INSERT_SQL, insertParams(task, next));
  return Response.json({ ok: true }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await requireUser(request, "admin");
  if (user instanceof Response) return user;
  const tasks = (await request.json()) as Partial<Task>[];
  if (!Array.isArray(tasks)) return Response.json({ error: "expected an array of tasks" }, { status: 400 });
  const sql = db();
  await sql.transaction([
    sql.query("DELETE FROM tasks"),
    ...tasks.filter((t) => t.id && t.title).map((t, i) => sql.query(INSERT_SQL, insertParams(t, i + 1))),
  ]);
  return Response.json({ ok: true });
}
