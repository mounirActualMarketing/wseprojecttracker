import { NextResponse, type NextRequest } from "next/server";
import { authFailure, checkAuth } from "@/lib/auth";

// Password-protects every page and API route. The API routes also check on their own.
export function proxy(request: NextRequest) {
  const result = checkAuth(request.headers.get("authorization"));
  if (result !== "ok") return authFailure(result);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brands/).*)"],
};
