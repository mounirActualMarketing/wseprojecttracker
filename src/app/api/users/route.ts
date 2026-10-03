import { INVITE_DAYS, hashToken, newToken, newUserId, requireUser } from "@/lib/auth";
import { db, str, userFromRow } from "@/lib/db";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "member", "viewer"];

// POST (admin): add a team member and return a one-time invite token for the link.
export async function POST(request: Request) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(body.name, 120).trim();
  const email = str(body.email, 200).trim().toLowerCase();
  const role = ROLES.includes(body.role as Role) ? (body.role as Role) : "member";
  const team = body.team ? str(body.team, 100) : null;
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Enter a name and a valid email." }, { status: 400 });
  }

  const sql = db();
  const exists = await sql.query("SELECT 1 FROM users WHERE lower(email) = $1", [email]);
  if (exists.length) return Response.json({ error: "Someone with this email is already on the team." }, { status: 409 });

  const token = newToken();
  const rows = await sql.query(
    `INSERT INTO users (id, name, email, role, team_id, invite_hash, invite_expires)
     VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(days => $7)) RETURNING *`,
    [newUserId(), name, email, role, team, hashToken(token), INVITE_DAYS],
  );
  return Response.json({ user: userFromRow(rows[0] as Parameters<typeof userFromRow>[0]), token }, { status: 201 });
}
