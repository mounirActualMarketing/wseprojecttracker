import { requireUser } from "@/lib/auth";
import { db, isColor, str } from "@/lib/db";

// PATCH (member or admin): rename or recolour.
// DELETE (admin): remove; tasks in it move to ?moveTo=<system id>, which is required when it has tasks.

export async function PATCH(request: Request, ctx: RouteContext<"/api/systems/[id]">) {
  const user = await requireUser(request, "member");
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? str(body.name, 80).trim() : "";
  const short = typeof body.short === "string" ? str(body.short, 30).trim() : "";
  const color = isColor(body.color) ? body.color : null;
  const rows = await db().query(
    `UPDATE systems SET name = COALESCE(NULLIF($2, ''), name), short = COALESCE(NULLIF($3, ''), short), color = COALESCE($4, color)
     WHERE id = $1 RETURNING id`,
    [id, name, short, color],
  );
  if (!rows.length) return Response.json({ error: "System not found." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/systems/[id]">) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;
  const moveTo = new URL(request.url).searchParams.get("moveTo");
  const sql = db();
  const [{ n }] = (await sql.query("SELECT count(*)::int AS n FROM tasks WHERE system = $1", [id])) as { n: number }[];
  if (n > 0) {
    if (!moveTo || moveTo === id) return Response.json({ error: "Choose a system to move its tasks to." }, { status: 400 });
    const target = await sql.query("SELECT 1 FROM systems WHERE id = $1", [moveTo]);
    if (!target.length) return Response.json({ error: "The target system does not exist." }, { status: 400 });
  }
  await sql.transaction([
    sql.query("UPDATE tasks SET system = $2, updated_at = now() WHERE system = $1", [id, moveTo ?? id]),
    sql.query("DELETE FROM systems WHERE id = $1", [id]),
  ]);
  return Response.json({ ok: true });
}
