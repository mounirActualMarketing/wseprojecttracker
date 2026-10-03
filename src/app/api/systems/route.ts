import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { db, isColor, str, systemFromRow } from "@/lib/db";

// POST (member or admin): add a system to the sidebar.
export async function POST(request: Request) {
  const user = await requireUser(request, "member");
  if (user instanceof Response) return user;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(body.name, 80).trim();
  if (!name) return Response.json({ error: "Give the system a name." }, { status: 400 });
  const short = str(body.short, 30).trim() || name.slice(0, 30);
  const color = isColor(body.color) ? body.color : "#64748B";
  const rows = await db().query(
    `INSERT INTO systems (id, name, short, color, sort) VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort), 0) + 1 FROM systems)) RETURNING *`,
    [`s_${randomBytes(4).toString("hex")}`, name, short, color],
  );
  return Response.json(systemFromRow(rows[0] as Parameters<typeof systemFromRow>[0]), { status: 201 });
}
