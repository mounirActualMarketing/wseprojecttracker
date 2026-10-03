import { NextResponse } from "next/server";
import { cookieOptions, endSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  await endSession(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
