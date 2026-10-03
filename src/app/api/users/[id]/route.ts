import { requireUser } from "@/lib/auth";
import { db, str } from "@/lib/db";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "member", "viewer"];

// PATCH (admin): change name, role, team, or deactivate / reactivate a member.
export async function PATCH(request: Request, ctx: RouteContext<"/api/users/[id]">) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sql = db();

  // never leave the workspace without an active admin
  const losingAdmin = ("role" in body && body.role !== "admin") || body.active === false;
  if (losingAdmin) {
    const [{ admins }] = (await sql.query(
      "SELECT count(*)::int AS admins FROM users WHERE role = 'admin' AND active AND id <> $1",
      [id],
    )) as { admins: number }[];
    const [target] = (await sql.query("SELECT role FROM users WHERE id = $1", [id])) as { role: string }[];
    if (target?.role === "admin" && admins === 0) {
      return Response.json({ error: "Keep at least one active admin." }, { status: 400 });
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (typeof body.name === "string" && body.name.trim()) add("name", str(body.name, 120).trim());
  if (ROLES.includes(body.role as Role)) add("role", body.role);
  if ("team" in body) add("team_id", body.team ? str(body.team, 100) : null);
  if (typeof body.active === "boolean") add("active", body.active);
  if (!sets.length) return Response.json({ error: "Nothing to update." }, { status: 400 });

  params.push(id);
  const rows = await sql.query(`UPDATE users SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING id`, params);
  if (!rows.length) return Response.json({ error: "Member not found." }, { status: 404 });
  if (body.active === false) await sql.query("DELETE FROM sessions WHERE user_id = $1", [id]);
  return Response.json({ ok: true });
}
