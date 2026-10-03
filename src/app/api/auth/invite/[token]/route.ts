import { NextResponse } from "next/server";
import { cookieOptions, createSession, hashPassword, hashToken, MIN_PASSWORD, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { db, str } from "@/lib/db";

// Invite and password-reset links: GET shows who the link is for, POST sets the password and signs in.

async function findInvite(token: string) {
  const rows = await db().query(
    `SELECT id, name, email FROM users WHERE invite_hash = $1 AND invite_expires > now() AND active`,
    [hashToken(token)],
  );
  return rows[0] as { id: string; name: string; email: string } | undefined;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/auth/invite/[token]">) {
  const { token } = await ctx.params;
  const invite = await findInvite(token);
  if (!invite) return NextResponse.json({ error: "This link is invalid or has expired. Ask an admin for a new one." }, { status: 404 });
  return NextResponse.json({ name: invite.name, email: invite.email });
}

export async function POST(request: Request, ctx: RouteContext<"/api/auth/invite/[token]">) {
  const { token } = await ctx.params;
  const invite = await findInvite(token);
  if (!invite) return NextResponse.json({ error: "This link is invalid or has expired. Ask an admin for a new one." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = str(body.password, 200);
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `Use at least ${MIN_PASSWORD} characters for the password.` }, { status: 400 });

  const sql = db();
  await sql.transaction([
    sql.query(
      `UPDATE users SET password_hash = $2, invite_hash = NULL, invite_expires = NULL, failed_logins = 0, locked_until = NULL, updated_at = now() WHERE id = $1`,
      [invite.id, await hashPassword(password)],
    ),
    // a reset signs out every other device
    sql.query("DELETE FROM sessions WHERE user_id = $1", [invite.id]),
  ]);
  const session = await createSession(invite.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, cookieOptions(SESSION_DAYS * 86400));
  return res;
}
