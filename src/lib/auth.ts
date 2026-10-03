import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, userFromRow } from "./db";
import type { Role, User } from "./types";

// Email + password accounts with server-side sessions.
// The cookie holds a random token; the database stores only its SHA-256 hash.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "wse_session";
export const SESSION_DAYS = 30;
export const INVITE_DAYS = 7;
const MAX_FAILED = 10;
const LOCK_MINUTES = 15;

export const MIN_PASSWORD = 10;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, saltB64, keyB64] = stored.split("$");
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(key, expected);
}

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newUserId = () => `u_${randomBytes(6).toString("hex")}`;

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string) {
  const token = newToken();
  await db().query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), userId, SESSION_DAYS],
  );
  return token;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function getUser(request: Request): Promise<User | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const rows = await db().query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
    [hashToken(token)],
  );
  return rows.length ? userFromRow(rows[0] as Parameters<typeof userFromRow>[0]) : null;
}

export async function endSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await db().query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

const RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2 };

/**
 * For route handlers. Returns the signed-in user, or a Response to send back:
 * 401 when not signed in, 403 when the role is too low.
 */
export async function requireUser(request: Request, minRole: Role = "viewer"): Promise<User | Response> {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (RANK[user.role] < RANK[minRole]) {
    return Response.json({ error: minRole === "admin" ? "Only admins can do this" : "Your account is view only" }, { status: 403 });
  }
  return user;
}

/** Login with lockout after repeated failures. */
export async function login(email: string, password: string): Promise<{ user: User } | { error: string }> {
  const sql = db();
  const rows = await sql.query("SELECT * FROM users WHERE lower(email) = lower($1)", [email.trim()]);
  const row = rows[0] as (Parameters<typeof userFromRow>[0] & { failed_logins: number; locked_until: string | null }) | undefined;
  const generic = { error: "Email or password is incorrect." };
  if (!row || !row.active || !row.password_hash) {
    // spend similar time as a real check
    await verifyPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86));
    return generic;
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    const lock = failed >= MAX_FAILED;
    await sql.query(
      `UPDATE users SET failed_logins = $2, locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE NULL END WHERE id = $1`,
      [row.id, lock ? 0 : failed, lock, LOCK_MINUTES],
    );
    return generic;
  }
  await sql.query("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [row.id]);
  return { user: userFromRow(row) };
}

/** First-admin setup is allowed only while there are no users, with APP_PASSWORD as the setup key. */
export function checkSetupKey(key: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasUsers() {
  const rows = (await db().query("SELECT EXISTS (SELECT 1 FROM users) AS any")) as { any: boolean }[];
  return rows[0].any;
}
