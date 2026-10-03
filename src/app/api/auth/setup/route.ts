import { NextResponse } from "next/server";
import { checkSetupKey, cookieOptions, createSession, hashPassword, hasUsers, MIN_PASSWORD, newUserId, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { db, str, userFromRow } from "@/lib/db";

// First admin account. Works only while the users table is empty, and needs APP_PASSWORD as the setup key.

export async function GET() {
  return NextResponse.json({ needed: !(await hasUsers()), configured: !!process.env.APP_PASSWORD });
}

export async function POST(request: Request) {
  if (await hasUsers()) return NextResponse.json({ error: "Setup is already done. Sign in instead." }, { status: 409 });
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "APP_PASSWORD is not configured on the server, so setup is locked." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!checkSetupKey(str(body.key, 200))) return NextResponse.json({ error: "The setup key is not correct." }, { status: 403 });

  const name = str(body.name, 120).trim();
  const email = str(body.email, 200).trim().toLowerCase();
  const password = str(body.password, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter your name and a valid email." }, { status: 400 });
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `Use at least ${MIN_PASSWORD} characters for the password.` }, { status: 400 });

  const id = newUserId();
  const rows = await db().query(
    `INSERT INTO users (id, name, email, role, team_id, password_hash) VALUES ($1, $2, $3, 'admin', 'csm', $4) RETURNING *`,
    [id, name, email, await hashPassword(password)],
  );
  const token = await createSession(id);
  const res = NextResponse.json({ user: userFromRow(rows[0] as Parameters<typeof userFromRow>[0]) });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86400));
  return res;
}
