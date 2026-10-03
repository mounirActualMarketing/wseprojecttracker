import { requireUser } from "@/lib/auth";
import { COLUMNS, db } from "@/lib/db";

// PATCH: update some fields of one task. DELETE: remove it and drop it from other tasks' dependencies.

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const user = await requireUser(request, "member");
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const patch = (await request.json()) as Record<string, unknown>;

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const c = COLUMNS[key];
    if (!c) continue; // ignore unknown fields, including id
    params.push(c.coerce(value));
    sets.push(`${c.col} = $${params.length}${c.cast ? `::${c.cast}` : ""}`);
  }
  if (!sets.length) return Response.json({ error: "nothing to update" }, { status: 400 });

  params.push(id);
  const sql = db();
  const rows = await sql.query(`UPDATE tasks SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING id`, params);
  if (!rows.length) return Response.json({ error: "task not found" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const user = await requireUser(request, "member");
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const sql = db();
  await sql.transaction([
    sql.query("DELETE FROM tasks WHERE id = $1", [id]),
    sql.query("UPDATE tasks SET depends_on = array_remove(depends_on, $1), updated_at = now() WHERE $1 = ANY(depends_on)", [id]),
  ]);
  return Response.json({ ok: true });
}
