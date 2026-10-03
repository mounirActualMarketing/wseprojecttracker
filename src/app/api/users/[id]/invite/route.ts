import { INVITE_DAYS, hashToken, newToken, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST (admin): a fresh one-time link for this member, used for a lost invite or a password reset.
export async function POST(request: Request, ctx: RouteContext<"/api/users/[id]/invite">) {
  const admin = await requireUser(request, "admin");
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;
  const token = newToken();
  const rows = await db().query(
    `UPDATE users SET invite_hash = $2, invite_expires = now() + make_interval(days => $3), updated_at = now()
     WHERE id = $1 AND active RETURNING id`,
    [id, hashToken(token), INVITE_DAYS],
  );
  if (!rows.length) return Response.json({ error: "Member not found or deactivated." }, { status: 404 });
  return Response.json({ token });
}
