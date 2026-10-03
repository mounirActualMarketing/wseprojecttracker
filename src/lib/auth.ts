import { timingSafeEqual } from "node:crypto";

// One shared team password (APP_PASSWORD) checked with HTTP Basic auth.
// Fails closed in production when the password is not configured.

export type AuthResult = "ok" | "denied" | "unconfigured";

export function checkAuth(authorization: string | null): AuthResult {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return process.env.NODE_ENV === "production" ? "unconfigured" : "ok";
  if (!authorization?.startsWith("Basic ")) return "denied";
  let decoded = "";
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return "denied";
  }
  // any username, the password is what counts
  const password = decoded.slice(decoded.indexOf(":") + 1);
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "denied";
}

export function authFailure(result: Exclude<AuthResult, "ok">) {
  if (result === "unconfigured") {
    return new Response("APP_PASSWORD is not configured for this deployment.", { status: 503 });
  }
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="WSE Strategy System", charset="UTF-8"' },
  });
}

/** For route handlers: returns a Response when the request must be rejected. */
export function guard(request: Request): Response | null {
  const r = checkAuth(request.headers.get("authorization"));
  return r === "ok" ? null : authFailure(r);
}
