import { NextResponse } from "next/server";
import { hashPassword, MIN_PASSWORD, requireUser, verifyPassword } from "@/lib/auth";
import { db, str } from "@/lib/db";

// Change your own password.
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => ({}))) as { current?: string; next?: string };
  const next = str(body.next, 200);
  if (next.length < MIN_PASSWORD) return NextResponse.json({ error: `Use at least ${MIN_PASSWORD} characters for the new password.` }, { status: 400 });

  const sql = db();
  const [row] = (await sql.query("SELECT password_hash FROM users WHERE id = $1", [user.id])) as { password_hash: string | null }[];
  if (!(await verifyPassword(str(body.current, 200), row?.password_hash ?? null))) {
    return NextResponse.json({ error: "Your current password is not correct." }, { status: 400 });
  }
  await sql.query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1", [user.id, await hashPassword(next)]);
  return NextResponse.json({ ok: true });
}
