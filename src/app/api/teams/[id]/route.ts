import { requireUser } from "@/lib/auth";
import { db, isColor, str } from "@/lib/db";

// PATCH (admin): rename or recolour. DELETE (admin): remove; its members and tasks keep working with no team.

export async function PATCH(request: Request, ctx: RouteContext<"/api/teams/[id]">) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? str(body.name, 80).trim() : "";
  const color = isColor(body.color) ? body.color : null;
  if (!name && !color) return Response.json({ error: "Nothing to update." }, { status: 400 });
  const rows = await db().query(
    "UPDATE teams SET name = COALESCE(NULLIF($2, ''), name), color = COALESCE($3, color) WHERE id = $1 RETURNING id",
    [id, name, color],
  );
  if (!rows.length) return Response.json({ error: "Team not found." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/teams/[id]">) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;
  const sql = db();
  await sql.transaction([
    sql.query("UPDATE users SET team_id = NULL WHERE team_id = $1", [id]),
    sql.query("UPDATE tasks SET team_id = NULL WHERE team_id = $1", [id]),
    sql.query("DELETE FROM teams WHERE id = $1", [id]),
  ]);
  return Response.json({ ok: true });
}
