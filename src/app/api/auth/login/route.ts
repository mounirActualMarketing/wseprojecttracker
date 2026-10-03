import { NextResponse } from "next/server";
import { cookieOptions, createSession, login, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { str } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = str(body.email, 200);
  const password = str(body.password, 200);
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const result = await login(email, password);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });

  const token = await createSession(result.user.id);
  const res = NextResponse.json({ user: result.user });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86400));
  return res;
}
