import { NextResponse, type NextRequest } from "next/server";

// Sends visitors without a session cookie to /login. This is only the first gate:
// every API route validates the session and role against the database itself.

const SESSION_COOKIE = "wse_session";
const PUBLIC = ["/login", "/setup", "/invite/", "/api/auth/"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brands/).*)"],
};
