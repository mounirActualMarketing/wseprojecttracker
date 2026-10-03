import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { db, isColor, str, teamFromRow } from "@/lib/db";

// POST (admin): add a team.
export async function POST(request: Request) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(body.name, 80).trim();
  if (!name) return Response.json({ error: "Give the team a name." }, { status: 400 });
  const color = isColor(body.color) ? body.color : "#64748B";
  const sql = db();
  const rows = await sql.query(
    `INSERT INTO teams (id, name, color, sort) VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort), 0) + 1 FROM teams)) RETURNING *`,
    [`t_${randomBytes(4).toString("hex")}`, name, color],
  );
  return Response.json(teamFromRow(rows[0] as Parameters<typeof teamFromRow>[0]), { status: 201 });
}
